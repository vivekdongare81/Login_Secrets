require("dotenv").config();

const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

// const encrypt =require("mongoose-encryption");
// const md5=require("md5");

// const bcrypt = require("bcrypt");
// const noOfSaltRounds = 10;

const session =require("express-session");
const passport=require("passport");
const passportLocalMongoose =require("passport-local-mongoose");
const GoogleStrategy = require( "passport-google-oauth20" ).Strategy;
const findOrCreate =require("mongoose-findorcreate");


const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//.......creating session
app.use(session({
    secret:"This secret should be in .env file",
    resave:false,
    saveUninitialized:false
}));

//.....initializing passport & using Session 
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userCredentialsDB", { useNewUrlParser: true });

const userSchema = new mongoose.Schema({
    NAME:String,
    USERNAME: String,
    PASSWORD: String,
    SECRET : String
    
});

userSchema.plugin(passportLocalMongoose);  //...connect passport to mongoose
userSchema.plugin(findOrCreate);

// Variable Encryption Key That is in .env File
// const secret = "ThisIsRandomStringToEncrypt";

// .......This will Encrypt Whole Doc in collection
// userSchema.plugin( encrypt , {secret:encKey} );

// .......This will Encrypt Only Specific Fields of Doc in collection
// userSchema.plugin( encrypt , { secret:process.env.SECRET, encryptedFields:["PASSWORD"] });

const userCollect = new mongoose.model("userCollect", userSchema);

passport.use(userCollect.createStrategy()); //connect passport to Collection 

passport.serializeUser(userCollect.serializeUser());
passport.deserializeUser(userCollect.deserializeUser());


//....oauth for GOOGLE Authentication
//  passport.use(new GoogleStrategy({
//     clientID: process.env.CLIENT_ID,
//     clientSecret: process.env.CLIENT_SECRET,
//     callbackURL: "http://localhost:3000/auth/google/secrets",
//     userProfileURL:"http://www.googleapis.com/oauth2/v3/userinfo"
//   },
//   function(request, accessToken, refreshToken, profile, done) {
//     userCollect.findOrCreate({ googleId: profile.id }, function (err, user) {
//         if(err){ console.log(err); }
//       return cb(err, user);
//     });
//   }
// ));


app.get("/", (req, res) => {
    res.render("home");
});

app.get("/secrets",(req,res)=>{
    userCollect.find( {SECRET: {$ne:null}} , (err, foundedUsers)=>{
        if(req.isAuthenticated()){res.render("secrets",{req:req ,USER:req.user.NAME,foundedUsers:foundedUsers});
    }
        else{ res.render("secrets",{req:req ,USER:"",foundedUsers:foundedUsers});
    } 
   
    });
    
   
});

//......Using GOOGLE Authentication
app.get("/auth/google",(req,res)=>{ 
   
    passport.authenticate( "google" , { scope: [  "profile" ] }); 
  
});
  
// Geting Register page on Request & rendering SECRETS 
// only after Adding (POST) new User Doc in Collection 
app.route("/register")
    .get((req, res) => {
        res.render("register"); 
    })
    .post((req, res) => {
       
        userCollect.register( {username:req.body.username},req.body.password,function(err,user){
         if(err){ console.log(err); res.redirect("register"); }
         else{ console.log(user);
            userCollect.updateOne(
                { username: user.username },
                { $set: { NAME: req.body.name }},{upsert:true}).then((result, err) => { 
                   
                   })

             passport.authenticate("local")(req,res,function(){
               res.redirect("secrets");
             });
         }
        } );

    });


// Check that user is already registered or not & showing secrets if yes 
app.route("/login")
    .get((req, res) => {
        res.render("login");
    })

    .post((req, res) => {
  
        const newUser= new userCollect({
            username:req.body.username,
            password:req.body.password
        });

req.login( newUser , (err)=>{
    if(err){ console.log(err); }
    else{
        passport.authenticate("local")(req,res,function(){
            res.redirect("secrets");
          });
    }
});
   
    });

//......logging out user from session which delete its cookies
app.route("/logout").get((req,res)=>{
req.logout();
res.redirect("/");
});

app.route("/submitsecret")
   .get((req, res) => {
    if(req.isAuthenticated()){ res.render("submit"); }
    else{ res.redirect("/"); } 
})

     .post((req,res)=>{
   
console.log( req.user.username );
userCollect.updateOne(
    { username: req.user.username },
    { $set: { SECRET: req.body.secret }},{upsert:true}).then((result, err) => { 
        res.redirect("/secrets");
       })
});

// app.get("/pop",(req,res)=>{
// userCollect.deleteOne({username:req.user.username},(err)=>{
//     if(err) console.log(err);
//     else res.redirect("/secrets");
// });
// });

app.listen(process.env.port || 3000, (req, res) => {
    if (req) { console.log("Error in starting server"); }
    else { console.log("Server Started Succesfully ......"); }
});












//.............code for post using bcrypt & salting 
   

//........register
  // bcrypt.hash(req.body.password, noOfSaltRounds, (err, saltedHash) => {
        //     let newUser = new userCollect({
        //         USERNAME: req.body.username,
        //         PASSWORD: saltedHash
        //     });

        //     newUser.save((err) => {
        //         if (err) { console.log("Error in Adding new User"); }
        //         else { res.render("login"); }
        //     });
        // });



//........login
// userCollect.findOne({ USERNAME: req.body.username }, function (err, foundDoc) {
        //     if (err) { res.send("Account with Same Password Not Found Plzz Check Password or Register First !"); }
        //     else {

        //         bcrypt.compare(req.body.password, foundDoc.PASSWORD, (err, result) => {
        //              if(result===true){ res.render("secrets"); }
        //         });
        //     }
        // });