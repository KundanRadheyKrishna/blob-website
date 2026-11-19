const mongoose = require('mongoose');
const postSchema = new mongoose.Schema({
    username: [
        {
            type: mongoose.Schema.Types.ObjectId, ref: "user"
        }
    ],
    date: {
        type: Date,
        default: Date.now
    },
    imageUrl: {
    type: String,
    default: null
},

publicId: {
    type: String,
    default: null
},
   content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    likes: [
        { type: mongoose.Schema.Types.ObjectId, ref: "user" }
    ]
})

module.exports = mongoose.model('post', postSchema)
