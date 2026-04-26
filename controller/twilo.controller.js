const twilio = require("twilio");

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;


// To start call and send the token to frontend
exports.startCall=async (req,res)=>{
    try{
    const { customerNumber } = req.body;

    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity: "user_" + Date.now() }
    );

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_APP_SID,
    });

    token.addGrant(voiceGrant);

    return res.json({
      success: true,
      token: token.toJwt(),
      to: customerNumber,
    });

    }catch(error){
        console.error("Error starting call:", error);
        res.status(500).json({ message: "Failed to start call" });
    }
}

//when the call is happend the twilo used this 
exports.voiceHandler = (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  const dial = response.dial({
    record: "record-from-answer",
    recordingStatusCallback: "https://crmbe.onrender.com/api/twilo/recording",
  });

  dial.number(req.body.To);

  res.type("text/xml");
  res.send(response.toString());
};



// Twilio sends recording here
exports.recordingHandler = (req, res) => {
  const { RecordingUrl, CallSid, RecordingDuration } = req.body;

  console.log("Recording URL:", RecordingUrl);
  console.log("Call SID:", CallSid);


  res.sendStatus(200);
};