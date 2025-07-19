## Installation

To install, follow these steps:

1. Clone the repository.
2. Install the dependencies in both the client and server directories by running `npm i` at the root directory.
3. Create a .env file in the server directory and add the following environment variables:

```
PORT
MONGODB_URL
JWT_SECRET
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
SENDGRID_API_KEY
```

The MONGODB_URL is the connection string to your MongoDB database. The JWT_SECRET can be any string of your choice. Additionally, include the TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN for Twilio integration. Sendgrid API used for sending emails

4. Run `npm run dev` at the root directory to start the development server and launch the app in your browser.
5. Navigate to http://localhost:4444/ to view the project.

## Features

🔐 User Authentication:

- Sign In and Sign Up: Users can easily create accounts or log in to access the quiz platform.

📱 OTP Verification:

- Secure Verification: Ensure user authenticity through OTP verification, adding an extra layer of security.

🏆 Ranking System:

- Dynamic User Rankings: Compete with others and track your progress through a dynamic ranking system.

🌐 Categories and Variety:

- Diverse Quiz Categories: Explore a range of quiz categories, each offering a variety of questions to keep the experience engaging.

🤔 Question Variety:

- Rich Question Database: Enjoy a diverse set of questions within each category, making every quiz unique.
