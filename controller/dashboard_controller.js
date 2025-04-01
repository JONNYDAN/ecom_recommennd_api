const User = require('../models/user_model');
const asyncHandler = require('express-async-handler');

const getProfileDetails = asyncHandler(async (req, res) => {
    let userId = req.user._id;
    try {
        const userDetail = await User.findOne(userId, '-password').lean();
        const stats = await AllTimeLeaderboard.findOne({
            user: userId
        }, '-user')
        let rank = null;
        let successRate = 0;
        let averagePointsPerQuiz = 0;
        const totalQuizzesAvailable = await Quiz.countDocuments();
        let quizParticipationRate = 0;
        let statsResult = null;
        const totalQuizPlay = await UserQuizHistory.aggregate([
            { 
                $match: { user: userId }
            },
            {
                $group: {
                    _id: "$quiz",
                }
            
            },
            {
                $count: "count"
            }]);
        console.log(totalQuizPlay)
        if (stats) {
            successRate = (stats.quizWon / stats.quizPlayed) * 100;
            averagePointsPerQuiz = stats.points / stats.quizPlayed;
            quizParticipationRate = (stats.quizPlayed / totalQuizzesAvailable) * 100;

            const userPoints = stats.points;
            const higherRankUsers = await AllTimeLeaderboard.countDocuments({
                points: { $gt: userPoints }
            });
            rank = higherRankUsers + 1;

            statsResult = {
                quiz_won: stats.quizWon,
                _id: stats._id,
                points: stats.points,
                total_quiz_played: totalQuizPlay? totalQuizPlay[0].count : 0,
                rank: rank,
                success_rate: successRate,
                average_points_per_quiz: averagePointsPerQuiz,
                quiz_participation_rate: quizParticipationRate,
                createdAt: stats.createdAt,
                updatedAt: stats.updatedAt
            };
        }

        res.json({
            code: 200, status: true, message: 'Profile details fetched successfully',
            user_detail: userDetail,
            // badge: {},
            stats: statsResult,
        });
    }
    catch (err) {
        throw new Error(err);
    }
});

module.exports = {
    getProfileDetails
};