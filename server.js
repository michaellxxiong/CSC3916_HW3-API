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
    .get(authJwtController.isAuthenticated, async (req, res) => {
        return res.status(500).json({ success: false, message: 'GET request not supported' });
    })
    .post(authJwtController.isAuthenticated, async (req, res) => {
        return res.status(500).json({ success: false, message: 'POST request not supported' });
    })

    .post(authJwtController.isAuthenticated, async (req, res) => {
        Movie.findOne({Title: req.body.Title}, function(err)
        {
            if (err)
            {
                res.status(400);
            }
            else if(req.body.ActorsAndCharacters.length < 3)
            {
                res.json({message: "You must have at least 3 actors and characters per movie!"});
            }
            else if (req.data !== 0) {
                let newmovie = new Movie;
                newmovie.Title = req.body.Title;
                newmovie.ReleaseDate = req.body.ReleaseDate;
                newmovie.Genre = req.body.Genre;
                newmovie.ActorsAndCharacters = req.body.ActorsAndCharacters;

                newmovie.save(function (err)
                {
                    if (err)
                    {
                       res.json({message: err});
                    }
                    else
                    {
                        res.json({status: 200, success: true, message: "The movie " + req.body.Title + " has been successfully saved!"});
                    }
                });
            }
        });
    })
    .get(authJwtController.isAuthenticated, async (req, res) => {
        Movie.find({Title: req.body.Title}, function(err, data)
        {
            if (err)
            {
                res.json(err);
                res.json({message: "There was an issue trying to find your movie"})
            }
            else if (data.length === 0)
            {
                res.json({message: "The Movie " + req.body.Title + " was not found"});
            }
            else
            {
                res.json({status: 200, message: "The movie with " + req.body.Title + " was found!"});
            }
        })
    })
    .put(authJwtController.isAuthenticated, async (req,res) => {
        Movie.findOneAndUpdate({Title: req.body.Title},
        {
            Title: req.body.Title,
            ReleaseDate: req.body.ReleaseDate,
            Genre: req.body.Genre,
            ActorsAndCharacters: req.body.ActorsAndCharacters
        },function(err, doc, data)
            {
                if(err)
                {
                    res.json({message: err});
                    res.json({message: "There was an issue trying to update your movie."})
                }
                else if(doc === 0)
                {
                    res.json({message: "Sorry the movie wanted to update was not found in the data base."});
                }
                else
                {
                    res.json({status: 200, message: "The Movie " + req.body.Title + " has been updated!!"});

                }

            });
    })
    .delete(authJwtController.isAuthenticated, async (req, res) => {
        Movie.findOneAndDelete({Title: req.body.Title}, function(err, data)
        {
            if (err)
            {
                res.json(err);
                res.json({message: "There was an issue trying to find your movie"})
            }
            else if (data.length === null)
            {   
                res.json({message: "The Movie " + req.body.Title + " was not found"});
            }
            else
            {
                res.json({message: "The movie with " + req.body.Title + " was deleted!"});
            }
        })
    });

app.use('/', router);

const PORT = process.env.PORT || 8080; // Define PORT before using it
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app; // for testing only