const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    //   host: "gmail",
    //   port: 587,
    service: "gmail",
    secure: false, // true for port 465, false for other ports
    auth: {
        user: "help.auctioneer@gmail.com",
        pass: "rxwo ihoi czqm idnu",
    },
});

// async..await is not allowed in global scope, must use a wrapper
async function sendMail({
    to = "rajay5767@gmail.com",
    subject = "Email From AUCTIONEER",
    text = "Hello User",
    html = "<b>Hello User</b>",
    attachments = [],
}) {
    const info = await transporter.sendMail({
        from: "help.auctioneer@gmail.com", // sender address
        to: to, // list of receivers
        subject: subject, // Subject line
        text: text, // plain text body
        html: html, // html body
        attachments: attachments,
    });

    console.log("Message sent: %s", info.messageId);
    // Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>
}


module.exports = { sendMail };
