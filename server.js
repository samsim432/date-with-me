import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, "submissions.json");

// Resend is optional.
// The server will still run when RESEND_API_KEY is empty.
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

app.disable("x-powered-by");

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST"],
  })
);

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

/* =========================================================
   HELPERS
========================================================= */

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
  }
}

function readSubmissions() {
  ensureDataFile();

  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(raw);

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Could not read submissions.json:", error);
    return [];
  }
}

function writeSubmissions(submissions) {
  const tempFile = `${DATA_FILE}.tmp`;

  fs.writeFileSync(
    tempFile,
    JSON.stringify(submissions, null, 2),
    "utf8"
  );

  fs.renameSync(tempFile, DATA_FILE);
}

function cleanText(value, maxLength = 500) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return cleanText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateTicketCode() {
  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `DATE-${random}`;
}

function validateSubmission(body) {
  const fields = {
    date: "Date",
    time: "Time",
    location: "Location",
    food: "Food",
    activity: "Activity",
    outfit: "Outfit",
    song: "Song",
    mystery: "Mystery choice",
    name: "Name",
    email: "Email",
  };

  for (const [field, label] of Object.entries(fields)) {
    if (!cleanText(body[field])) {
      return `${label} is required.`;
    }
  }

  const email = cleanText(body.email, 254);

  if (!isValidEmail(email)) {
    return "Please enter a valid email address.";
  }

  return null;
}

function buildEmailHtml(submission) {
  const name = escapeHtml(submission.name);
  const date = escapeHtml(submission.date);
  const time = escapeHtml(submission.time);
  const location = escapeHtml(submission.location);
  const food = escapeHtml(submission.food);
  const activity = escapeHtml(submission.activity);
  const outfit = escapeHtml(submission.outfit);
  const song = escapeHtml(submission.song);
  const mystery = escapeHtml(submission.mystery);
  const reply = escapeHtml(submission.reply || "No message");
  const ticketCode = escapeHtml(submission.ticketCode);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Date Invitation</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#fff5f8;
  font-family:Arial,Helvetica,sans-serif;
  color:#30252a;
">

  <div style="
    max-width:620px;
    margin:40px auto;
    padding:20px;
  ">

    <div style="
      background:#ffffff;
      border-radius:24px;
      overflow:hidden;
      border:1px solid #f4d9e2;
      box-shadow:0 12px 40px rgba(90,30,55,.08);
    ">

      <div style="
        padding:36px 28px;
        text-align:center;
        background:linear-gradient(135deg,#ffe7ef,#fff7fa);
      ">

        <div style="font-size:42px;">💗</div>

        <h1 style="
          margin:12px 0 8px;
          font-size:28px;
          color:#b93868;
        ">
          Date Invitation Confirmed
        </h1>

        <p style="
          margin:0;
          color:#765c67;
          font-size:15px;
        ">
          Your date details have been saved.
        </p>

      </div>

      <div style="padding:28px;">

        <p style="font-size:16px;">
          Hey ${name} 💕
        </p>

        <p style="
          color:#66545c;
          line-height:1.7;
        ">
          Here's everything we planned for your date.
        </p>

        <div style="
          margin:24px 0;
          padding:20px;
          background:#fff7fa;
          border-radius:18px;
          border:1px solid #f3dce4;
        ">

          <div style="margin-bottom:14px;">
            <strong>🎟 Ticket</strong><br>
            <span style="color:#b93868;">
              ${ticketCode}
            </span>
          </div>

          <div style="margin-bottom:12px;">
            <strong>📅 Date</strong><br>
            ${date}
          </div>

          <div style="margin-bottom:12px;">
            <strong>⏰ Time</strong><br>
            ${time}
          </div>

          <div style="margin-bottom:12px;">
            <strong>📍 Location</strong><br>
            ${location}
          </div>

          <div style="margin-bottom:12px;">
            <strong>🍽 Food</strong><br>
            ${food}
          </div>

          <div style="margin-bottom:12px;">
            <strong>🎯 Activity</strong><br>
            ${activity}
          </div>

          <div style="margin-bottom:12px;">
            <strong>👗 Outfit</strong><br>
            ${outfit}
          </div>

          <div style="margin-bottom:12px;">
            <strong>🎵 Song</strong><br>
            ${song}
          </div>

          <div>
            <strong>🎁 Mystery</strong><br>
            ${mystery}
          </div>

        </div>

        <div style="
          padding:18px;
          background:#fff0f5;
          border-radius:16px;
          margin-bottom:20px;
        ">

          <strong>💌 Message</strong>

          <p style="
            margin:8px 0 0;
            line-height:1.6;
            color:#66545c;
          ">
            ${reply}
          </p>

        </div>

        <p style="
          text-align:center;
          margin-top:28px;
          color:#8c717b;
          font-size:13px;
        ">
          Made with love 💗
        </p>

      </div>

    </div>

  </div>

</body>
</html>
`;
}

/* =========================================================
   ROUTES
========================================================= */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    server: "online",
    emailConfigured: Boolean(resend),
    timestamp: new Date().toISOString(),
  });
});


app.post("/api/submit-date", async (req, res) => {
  try {
    const body = req.body || {};

    const validationError = validateSubmission(body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError,
      });
    }

    const submission = {
      ticketCode:
        cleanText(body.ticketCode, 50) || generateTicketCode(),

      date: cleanText(body.date, 50),
      time: cleanText(body.time, 50),
      location: cleanText(body.location, 200),
      food: cleanText(body.food, 200),
      activity: cleanText(body.activity, 200),
      outfit: cleanText(body.outfit, 200),
      song: cleanText(body.song, 300),
      mystery: cleanText(body.mystery, 200),

      name: cleanText(body.name, 100),
      email: cleanText(body.email, 254),
      reply: cleanText(body.reply, 1000),

      submittedAt: new Date().toISOString(),
    };

    /* -----------------------------------------
       SAVE SUBMISSION
    ----------------------------------------- */

    const submissions = readSubmissions();

    submissions.push(submission);

    writeSubmissions(submissions);

    /* -----------------------------------------
       SEND EMAIL
    ----------------------------------------- */

    let emailSent = false;

    if (resend) {
      try {
        const result = await resend.emails.send({
          from: "Date Invitation <onboarding@resend.dev>",
          to: submission.email,
          subject: `💗 Date Invitation Confirmed - ${submission.ticketCode}`,
          html: buildEmailHtml(submission),
        });

        if (result.error) {
          console.error("Resend error:", result.error);
        } else {
          emailSent = true;
        }
      } catch (emailError) {
        console.error("Email delivery error:", emailError);
      }
    }

    /* -----------------------------------------
       RESPONSE
    ----------------------------------------- */

    return res.status(200).json({
      success: true,
      ticketCode: submission.ticketCode,
      emailSent,
      emailConfigured: Boolean(resend),
    });

  } catch (error) {
    console.error("Submission processing error:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to process the date submission.",
    });
  }
});


/* =========================================================
   ADMIN
========================================================= */

app.get("/admin/responses", (req, res) => {
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return res.status(503).json({
      error: "Admin access is not configured.",
    });
  }

  const suppliedKey =
    req.get("x-admin-key") ||
    req.query.key;

  if (!suppliedKey || suppliedKey !== adminSecret) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  try {
    const submissions = readSubmissions();

    return res.json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error("Admin response error:", error);

    return res.status(500).json({
      error: "Unable to read submissions.",
    });
  }
});


/* =========================================================
   FALLBACK
========================================================= */

app.use((req, res, next) => {
  if (req.method !== "GET") {
    return next();
  }

  res.sendFile(path.join(__dirname, "public", "index.html"));
});


/* =========================================================
   START SERVER
========================================================= */

ensureDataFile();

app.listen(PORT, () => {
  console.log("");
  console.log("💗 Date App Server");
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`📁 Data: ${DATA_FILE}`);
  console.log(
    `📧 Email: ${resend ? "configured" : "not configured"}`
  );
  console.log("");
});