const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const authJwtController = require('./auth_jwt'); // You're not using authController, consider removing it
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('./Users');
const Movie = require('./Movies'); // You're not using Movie, consider removing it

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

const router = express.Router();

// Removed getJSONObjectForMovieRequirement as it's not used

router.post('/signup', async (req, res) => { // Use async/await
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ success: false, msg: 'Please include both username and password to signup.' }); // 400 Bad Request
  }

  try {
    const user = new User({ // Create user directly with the data
      name: req.body.name,
      username: req.body.username,
      password: req.body.password,
    });

    await user.save(); // Use await with user.save()

    res.status(201).json({ success: true, msg: 'Successfully created new user.' }); // 201 Created
  } catch (err) {
    if (err.code === 11000) { // Strict equality check (===)
      return res.status(409).json({ success: false, message: 'A user with that username already exists.' }); // 409 Conflict
    } else {
      console.error(err); // Log the error for debugging
      return res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
    }
  }
});


router.post('/signin', async (req, res) => { // Use async/await
  try {
    const user = await User.findOne({ username: req.body.username }).select('name username password');

    if (!user) {
      return res.status(401).json({ success: false, msg: 'Authentication failed. User not found.' }); // 401 Unauthorized
    }

    const isMatch = await user.comparePassword(req.body.password); // Use await

    if (isMatch) {
      const userToken = { id: user._id, username: user.username }; // Use user._id (standard Mongoose)
      const token = jwt.sign(userToken, process.env.SECRET_KEY, { expiresIn: '1h' }); // Add expiry to the token (e.g., 1 hour)
      res.json({ success: true, token: 'JWT ' + token });
    } else {
      res.status(401).json({ success: false, msg: 'Authentication failed. Incorrect password.' }); // 401 Unauthorized
    }
  } catch (err) {
    console.error(err); // Log the error
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
  }
});

router.route('/movies')
    //Add a new movie
    .post(authJwtController.isAuthenticated, async (req, res) => {

        // Validate that the title field is provided
        if (!req.body.title || req.body.title.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Title is required!"
            });
        }

        // Validate that the releaseDate field is provided and is a number
        if (!req.body.releaseDate || isNaN(req.body.releaseDate)) {
            return res.status(400).json({
                success: false,
                message: "A valid releaseDate is required!"
            });
        }

        // Validate that the genre field is provided
        if (!req.body.genre || req.body.genre.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Genre is required!"
            });
        }

        // Validate that the actors field is provided and contains at least one actor
        if (!req.body.actors || req.body.actors.length === 0) {
            return res.status(400).json({
                success: false,
                message: "A movie must contain at least one actor!"
            });
        }

        try {

            // Create a new movie document
            const movie = new Movie({
                title: req.body.title,
                releaseDate: req.body.releaseDate,
                genre: req.body.genre,
                actors: req.body.actors
            });

            // Save the movie to the MongoDB database
            await movie.save();

            // Return success message with the movie object
            return res.status(201).json({
                success: true,
                message: `The movie "${req.body.title}" has been successfully saved!`,
                movie  // Return the created movie object
            });

        } catch (err) {

            return res.status(500).json({
                success: false,
                message: "Error saving movie",
                error: err.message
            });
        }
    })
    //Get all movies
    .get(authJwtController.isAuthenticated, async (req, res) => {
        try {
            // If no title, return all movies as an array
            const movies = await Movie.find();

            // Return the list of movies directly as an array
            return res.status(200).json(movies);  // Return just the array of movies

        } catch (err) {
            
            return res.status(500).json({
                success: false,
                message: "Error retrieving movies",
                error: err.message
            });
        }
      });

app.use('/', router);

//

const PORT = process.env.PORT || 8080; // Define PORT before using it
app.listen(PORT, () => {
console.log(`Server is running on port ${PORT}`);
});

module.exports = app; // for testing only