const Question = require('../models/question_model');
const Quiz = require('../models/quiz_model');
const Course = require('../models/course_model');
const QuizReportHistory = require('../models/quiz_report_history_model');
const CourseReportHistory = require('../models/course_report_history_model');
const asyncHandler = require('express-async-handler');
const { validateMongoDbId } = require("../utils/validate_mongo_db_id");


const getFullCourseExamDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // get course id
  let course = await Course.findOne({ _id: id })
  if (!course) {
    return res.status(404).json({ error: "Course not found!!!" });
  }

  // get list quiz

  let quizzes = await Quiz.find({ course: course._id })
  if (!quizzes) {
    return res.status(404).json({ error: "Quiz not found!!!" });
  }

  let quizSection = []
  for (let quiz of quizzes) {
    quizSection.push(await getQuizFullExam(quiz._id))
  }

  res.status(200).json({
    data: quizSection,
    success: 1
  })
});

const getQuizFullExam = asyncHandler(async (quizId) => {
  const quiz = await Quiz.findById({ _id: quizId })

  const questions = await Question.find({
    quiz: quizId
  })

  let data = {
    "course_id": quiz.course,
    "course_info": {
      "id": "string",
      "name": "string"
    },
    "group_name": "string",
    "id": quiz._id,
    "is_free": true,
    "is_purchased": true,
    "audio": quiz.audio,
    "title": quiz.title,
    "order_by": 2,
    "passing": 150,
    "question_count": questions.length,
    "time_minute": quiz.duration,
  }
  let total_score = 0
  data["exam"] = questions.map((q) => {
    let qData = {
      "difficulty_level": 0,
      "general_feedback": q.generalFeedback,
      "id": q._id,
      "group": q.group,
      "question_text": q.question,
      "question_type": 1,
      "score": q.point,
    }

    // Ensure options is an array before mapping
    if (!Array.isArray(q.options)) {
      console.error("Options not an array for question:", q._id);
      qData.list_answer = [];
      return qData;
    }

    console.log("Options array length:", q.options.length);

    // Convert correctOptionIndex to a number to ensure proper comparison
    const correctIndex = parseInt(q.correctOptionIndex);

    qData.list_answer = q.options.map((o, i) => {
      // Log each iteration for debugging
      console.log(`Option ${i + 1}:`, o, "Is correct:", (i) === correctIndex);

      return {
        "choice": o,
        "correct": i === correctIndex,  // Use strict equality and ensure both are numbers
      };
    });
    total_score += q.point
    return qData;
  });
  data["total_score"] = total_score
  return data;

})

// API Tạo course mới, đồng thời tạo quiz theo level tương ứng (Nếu N1, N2 thì tạo 2 quiz, Nếu N3, N4, N5 thì tạo 3 quiz)
const createCourse = asyncHandler(async (req, res) => {
  const { title, level, year } = req.body;
  const newCourse = new Course({
    title,
    level,
    year,
  });

  try {
    const course = await newCourse.save(); // Save course first

    let quizzes = [];
    if (level === 'N1' || level === 'N2') {
      quizzes = [
        new Quiz({ course: course._id, title: 'TV - NP - ĐH', duration: 60, questionCount: 0, audio: '' }),
        new Quiz({ course: course._id, title: 'Nghe hiểu', duration: 40, questionCount: 0, audio: '' })
      ];
    } else if (level === 'N3' || level === 'N4' || level === 'N5') {
      quizzes = [
        new Quiz({ course: course._id, title: 'TV', duration: 30, questionCount: 0, audio: '' }),
        new Quiz({ course: course._id, title: 'NP - ĐH', duration: 70, questionCount: 0, audio: '' }),
        new Quiz({ course: course._id, title: 'Nghe hiểu', duration: 45, questionCount: 0, audio: '' })
      ];
    }

    await Quiz.insertMany(quizzes); // Save all quizzes at once
    res.json({ code: 200, status: true, message: 'Course created successfully', course, quizzes });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// API Lấy thông tin chi tiết của 1 course và các quiz của course đó
const getCourseDetails = asyncHandler(async (req, res) => {
  const { course_id } = req.params;
  try {

    // Kiểm tra xem course_id có hợp lệ không
    if (!validateMongoDbId(course_id)) {
      return res.json({ code: 404, status: false, message: 'Invalid course_id format' });
    }

    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const quizzes = await Quiz.find({ course: course_id });
    res.json({ code: 200, status: true, course, quizzes });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// API lấy tất cả các course
const getAllCourses = asyncHandler(async (req, res) => {
  const search = req.query.search;

  try {
    let query = {};

    if (search) {
      query.$or = [
        { course: { $regex: search, $options: 'i' } },  // Tìm kiếm theo mã
        { user: { $regex: search, $options: 'i' } },  // Tìm kiếm theo id user
      ];
    }

    const allCourses = await Course.find(query); // Không cần populate author
    const courseCount = allCourses.length;

    if (allCourses.length > 0) {
      res.json({
        code: 200, status: true,
        count: courseCount,
        courses: allCourses,
      });
    } else {
      res.status(400).json({ message: 'No course found' });
    }
  } catch (err) {
    throw new Error(err);
  }
});

// API xóa 1 course theo course_id và xóa tất cả các quiz của course đó
const deleteSpecificCourse = asyncHandler(async (req, res) => {
  const { course_id } = req.params;

  try {
    // Kiểm tra xem course_id có hợp lệ không
    if (!validateMongoDbId(course_id)) {
      return res.json({ code: 404, status: false, message: 'Invalid course_id format' });
    }

    const deleteCode = await Course.findByIdAndDelete(course_id);
    const deleteQuiz = await Quiz.deleteMany({ course: course_id });

    if (deleteCode && deleteQuiz) {
      res.json({
        code: 200, status: true,
        message: 'Course deleted successfully'
      });
    } else {
      res.json({ code: 404, status: false, message: 'Course not found' });
    }

  } catch (err) {
    throw new Error(err);
  }
});

const updateActiaveCode = asyncHandler(async (req, res) => {
  const { course_id } = req.params;
  const { title, level, year } = req.body;

  try {
    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    course.title = title;
    course.level = level;
    course.year = year;

    await course.save();
    res.json({ code: 200, status: true, message: 'Course updated successfully', course });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// API lấy các course trending
const getTrendingCourses = async (req, res) => {
  try {
    // Lấy ra 2 khóa học trending sắp xếp theo số enrollments giảm dần
    const allCourses = await Course.find({})
      .sort({ enrollments: -1 })
      .limit(2);

    if (allCourses.length > 0) {
      // Với mỗi course, lấy các quiz có course trùng với course._id
      const coursesWithQuizzes = await Promise.all(
        allCourses.map(async (course) => {
          const quizzes = await Quiz.find({ course: course._id }).select(
            "_id title duration"
          );
          return {
            ...course.toObject(), // chuyển đổi thành object thuần để gộp dữ liệu
            quizzes, // thêm mảng quiz vào course
          };
        })
      );

      res.status(200).json({
        data: {
          data: coursesWithQuizzes,
        },
        success: 1,
      });
    } else {
      res.status(400).json({ message: "No course found" });
    }
  } catch (err) {
    throw new Error(err);
  }
};


const searchCourse = async (req, res) => {
  try {
    const { page, level, year } = req.query;
    const query = {};

    // Filter by level
    if (level) {
      query.level = level;
    }

    // Filter by year
    if (year) {
      query.year = year;
    }

    // Pagination
    const pageSize = 10;
    const currentPage = parseInt(page) || 1;
    const skip = (currentPage - 1) * pageSize;

    // Fetch filtered data
    const courses = await Course.find(query).skip(skip).limit(pageSize);
    const totalCourses = await Course.countDocuments(query);

    res.status(200).json({
      data: {
        data: courses,
        totalPage: Math.ceil(totalCourses / pageSize),
      },
      success: 1,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Internal Server Error',
      success: 0,
    });
  }
};

// Generate a comprehensive report for all courses attended by the user
const getUserCourseReport = async (req, res) => {
  try {
    const userId = req.user._id; // Get user ID from auth middleware
    
    // Find all course reports for this user
    const courseReports = await CourseReportHistory.find({ user: userId })
      .populate({
        path: 'course',
        select: 'title level year'
      })
      .sort({ createdAt: -1 });
    
    // Process each course report to include quiz details
    const formattedReports = await Promise.all(courseReports.map(async (courseReport) => {
      // Get all quizzes associated with this course report
      const quizReports = await QuizReportHistory.find({ 
        attendCourseId: courseReport._id,
        user: userId
      }).populate({
        path: 'quiz',
        select: 'title duration'
      });
      console.log("Quiz reports:", quizReports);
      // Format quiz details
      const detailQuizzes = quizReports.map(quiz => {
        // Calculate correct answer rate as a percentage
        const correctRate = quiz.questionCount > 0 
          ? (quiz.correctAnswer / quiz.questionCount) * 100 
          : 0;
        
        return {
          quiz_id: quiz.quiz._id,
          title: quiz.quiz.title,
          score: quiz.score,
          total_time: quiz.totalTime,
          correct_rate: parseFloat(correctRate.toFixed(1))
        };
      });
      
      // Construct the course report object
      return {
        course_id: courseReport?.course?._id,
        course_name: courseReport?.course?.title,
        course_info: {
          course_id: courseReport?.course?._id,
          title: courseReport?.course?.title,
          level: courseReport?.course?.level,
          year: courseReport?.course?.year
        },
        created_at: courseReport.createdAt,
        score: courseReport.score,
        correct_answer: courseReport.correctAnswer,
        detail_quizzes: detailQuizzes
      };
    }));
    
    // Return the formatted response
    return res.status(200).json({
      data: formattedReports,
      success: 1
    });
    
  } catch (error) {
    return res.status(500).json({
      error: `Internal Server Error: ${error.message}`,
      success: 0
    });
  }
};

module.exports = {
  getQuizFullExam, getFullCourseExamDetails, createCourse, getCourseDetails, getAllCourses, deleteSpecificCourse, updateActiaveCode, getTrendingCourses, searchCourse, getUserCourseReport
}

