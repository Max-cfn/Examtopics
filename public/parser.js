/**
 * Parser for examtopics-downloader markdown output.
 * Handles the format produced by https://github.com/thatonecodes/examtopics-downloader
 * Supports files generated with -c flag (includes discussions/comments)
 */

function parseExamTopicsMarkdown(content) {
    const questions = [];
    
    // Split by the separator used in the downloader output
    const blocks = content.split(/^-{3,}$/m).filter(b => b.trim());

    for (const block of blocks) {
        const question = parseQuestionBlock(block.trim());
        if (question) {
            questions.push(question);
        }
    }

    return questions;
}

function parseQuestionBlock(block) {
    // Extract question number and topic
    const questionNumMatch = block.match(/Question\s*#:\s*(\d+)/i);
    const topicNumMatch = block.match(/Topic\s*#:\s*(\d+)/i);
    const headerMatch = block.match(/##\s*(.+?)(?:\n|$)/);

    const lines = block.split('\n');
    let questionStartIdx = -1;
    let choicesStartIdx = -1;
    
    // Find where question text starts and choices begin
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.match(/^\[All\s+.*Questions\]/i)) {
            questionStartIdx = i + 1;
        }
        if (line.match(/^[A-F]\.\s+/) && choicesStartIdx === -1) {
            choicesStartIdx = i;
        }
    }

    if (questionStartIdx === -1) {
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().match(/Topic\s*#:\s*\d+/i)) {
                questionStartIdx = i + 1;
                break;
            }
        }
    }
    if (questionStartIdx === -1) questionStartIdx = 0;

    // Extract question text
    let questionText = '';
    if (choicesStartIdx > questionStartIdx) {
        const textLines = lines.slice(questionStartIdx, choicesStartIdx)
            .map(l => l.trim())
            .filter(l => l && !l.match(/^Suggested Answer:/i) && !l.match(/^🗳️$/));
        questionText = textLines.join('\n').trim();
    }
    questionText = questionText.replace(/Suggested Answer:\s*[A-F]\s*🗳️?\s*/gi, '').trim();

    // Extract choices
    const choices = [];
    const choiceRegex = /^([A-F])\.\s+(.+)/;
    for (const line of lines) {
        const match = line.trim().match(choiceRegex);
        if (match) {
            choices.push({ letter: match[1], text: match[2].trim() });
        }
    }

    // Extract correct answer - try multiple patterns
    let correctAnswer = '';
    const answerMatch = block.match(/\*\*Answer:\s*([A-F])\*\*/i) ||
                        block.match(/Answer:\s*([A-F])\b/i) ||
                        block.match(/Suggested Answer:\s*([A-F])/i);
    if (answerMatch) {
        correctAnswer = answerMatch[1].toUpperCase();
    }

    // If no answer found in the standard field, look in discussions for community consensus
    if (!correctAnswer) {
        // Look for "Selected Answer: X" with highest votes
        const selectedAnswers = [];
        const saMatches = block.matchAll(/Selected Answer:\s*([A-F]+).*?upvoted\s+(\d+)\s+times/gi);
        for (const m of saMatches) {
            selectedAnswers.push({ answer: m[1].toUpperCase(), votes: parseInt(m[2]) });
        }
        
        // Also look for "Highly Voted" answers
        const highlyVoted = block.match(/Highly Voted[\s\S]*?Selected Answer:\s*([A-F]+)/i);
        if (highlyVoted) {
            selectedAnswers.push({ answer: highlyVoted[1].toUpperCase(), votes: 100 }); // Boost highly voted
        }
        
        if (selectedAnswers.length > 0) {
            // Pick the most voted answer
            selectedAnswers.sort((a, b) => b.votes - a.votes);
            correctAnswer = selectedAnswers[0].answer;
        }
        
        // Fallback patterns if still no answer
        if (!correctAnswer) {
            const patterns = [
                /(?:correct answer|the answer)\s*(?:is|should be|:)\s*([A-F]+)\b/i,
                /(?:I (?:think|believe|go with|choose|pick|vote))\s*(?:it'?s?\s*)?([A-F]+)\b/i,
                /(?:voted?|go(?:ing)?\s+(?:for|with))\s+([A-F]+)\b/i,
            ];
            for (const pat of patterns) {
                const m = block.match(pat);
                if (m) {
                    correctAnswer = m[1].toUpperCase();
                    break;
                }
            }
        }
    }

    // Extract ExamTopics link
    let link = '';
    const linkMatch = block.match(/\[View on ExamTopics\]\((https:\/\/[^\)]+)\)/) ||
                      block.match(/(https:\/\/www\.examtopics\.com\/discussions\/[^\s\)]+)/);
    if (linkMatch) link = linkMatch[1];

    // Extract timestamp
    let timestamp = '';
    const tsMatch = block.match(/\*\*Timestamp:\s*(.+?)\*\*/);
    if (tsMatch) timestamp = tsMatch[1].trim();

    // Extract discussions/comments (the -c flag content)
    let discussions = [];
    let explanation = '';
    
    // Look for "Comments:" section which contains all discussions
    const commentsMatch = block.match(/Comments:\s*([\s\S]+?)(?=\n-{3,}|$)/);
    if (commentsMatch) {
        const commentsText = commentsMatch[1];
        
        // Extract "Highly Voted" comments first - they're the most reliable
        const highlyVotedMatch = commentsText.match(/(\w+)\s+Highly Voted\s+([\d\w\s,]+ago)\s*([\s\S]*?)(?=upvoted\s+\d+\s+times)/i);
        if (highlyVotedMatch) {
            const hvText = highlyVotedMatch[3].trim();
            discussions.push({
                user: highlyVotedMatch[1],
                time: highlyVotedMatch[2].trim(),
                text: hvText.substring(0, 600),
                highlyVoted: true
            });
            explanation = hvText.substring(0, 600);
        }
        
        // Extract "Selected Answer" entries with vote counts
        const saRegex = /(\w+)\s+(?:Highly Voted|Most Recent)?\s*([\d]+\s+\w+(?:,\s*\d+\s+\w+)?\s+ago)\s*Selected Answer:\s*([A-F]+)\s*([\s\S]*?)upvoted\s+(\d+)\s+times/gi;
        let saMatch;
        while ((saMatch = saRegex.exec(commentsText)) !== null) {
            discussions.push({
                user: saMatch[1],
                time: saMatch[2].trim(),
                text: `Selected Answer: ${saMatch[3]}. ${saMatch[4].trim()}`.substring(0, 600),
                votes: parseInt(saMatch[5]),
                selectedAnswer: saMatch[3]
            });
        }
        
        // Sort by votes
        discussions.sort((a, b) => (b.votes || 0) - (a.votes || 0));
        
        // If no explanation yet, use the top voted discussion
        if (!explanation && discussions.length > 0) {
            explanation = discussions[0].text;
        }
    }

    // Fallback: look for any text after the link that could be discussion
    if (!explanation && discussions.length === 0) {
        const afterLink = block.split(/\[View on ExamTopics\]/i);
        if (afterLink.length > 1) {
            const remainder = afterLink[1].replace(/^\([^\)]*\)\s*/, '').trim();
            if (remainder.length > 50) {
                explanation = remainder.substring(0, 600);
            }
        }
    }

    const topicNum = topicNumMatch ? topicNumMatch[1] : '?';
    const questionNum = questionNumMatch ? questionNumMatch[1] : '?';
    const title = headerMatch ? headerMatch[1].trim() : `Topic ${topicNum} Question ${questionNum}`;

    if (choices.length === 0) return null;

    return {
        id: `t${topicNum}q${questionNum}`,
        title,
        topic: topicNum,
        number: questionNum,
        text: questionText || title,
        choices,
        correctAnswer,
        multiAnswer: correctAnswer.length > 1, // e.g. "ABC" means 3 answers expected
        expectedCount: correctAnswer.length || 1,
        link,
        timestamp,
        explanation,
        discussions
    };
}
