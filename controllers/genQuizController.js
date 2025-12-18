//Controllers/genQuizController.js
const GenQuiz = require('../models/genQuiz');
const Admin = require('../models/admin');

//User asks a Question
exports.create = async (req, res) => {
    try {
        const { name, phone, email, message } = req.body;

            const genQuiz = new GenQuiz({
                name,
                phone,
                email,
                message,
            });
        
            await genQuiz.save();
        
            res.status(201).json({ message: 'Question sent successfully!' });
        } catch (error) {
        res.status(500).json({ message: 'Error submitting the question!', error: error.message });
    }
};

//Admins is able to find all the questions asked by the users
exports.findAll = async (req, res) => {
    try {
        const genQuiz = await GenQuiz.find({ status: 'Pending' })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            genQuiz
        });
    } catch (err) {
        console.error('Error:', err);
        return res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

//Admins is able to mark the question as answered
exports.Answered = async (req, res) => {
    try {
        const genQuiz = await GenQuiz.findById(req.params.id);
        if (!genQuiz) {
            return res.status(404).json({ message: 'Question not found' });
        }
        genQuiz.status = 'Answered';
        await genQuiz.save();
        res.status(200).json({ 
            success: true,
            message: 'Question marked as answered',
            data: genQuiz
         });
    } catch (error) {
        res.status(500).json({ message: 'Error marking the question as answered', error: error.message });
    }
};