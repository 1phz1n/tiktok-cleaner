const express = require("express");
const axios = require("axios");
const path = require("path");
const bodyParser = require("body-parser");
const { chromium } = require("playwright");

const app = express();

const CLIENT_KEY = "tt0k69d3gk2eqbzc"; // substitua pelo seu client_key
const CLIENT_SECRET = "TXgUVVmyLpOgLAmfLq7l014l6c5Qo0bw"; // seu client_secret
const REDIRECT_URI = "https://tiktok-cleaner.onrender.com/callback";



let accessToken = null;
let userInfo = null;
let removalStatus = { running: false, removed: 0, total: 0 };

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));


app.get("/", (req, res) => {
  res.render("index", { clientKey: CLIENT_KEY, redirectUri: REDIRECT_URI });
});

app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("Erro: Código não encontrado.");

  try {
    const tokenResponse = await axios.post(
      "https://open.tiktokapis.com/v2/oauth/token/",
      null,
      {
        params: {
          client_key: CLIENT_KEY,
          client_secret: CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI,
        },
      }
    );

    accessToken = tokenResponse.data.access_token;

    const userRes = await axios.get("https://open.tiktokapis.com/v2/user/info/", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    userInfo = userRes.data.data.user;
    res.render("logged", { user: userInfo });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.send("Erro ao autenticar.");
  }
});

app.post("/start-removal", async (req, res) => {
  if (removalStatus.running) {
    return res.json({ status: "Já em execução" });
  }

  removalStatus.running = true;
  removalStatus.removed = 0;
  removalStatus.total = 10;

  res.json({ status: "Iniciado" });

  (async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto("https://www.tiktok.com/login");

    console.log("Faça login manualmente no navegador.");

    await page.waitForTimeout(20000); // 20 segundos para login

    for (let i = 1; i <= removalStatus.total; i++) {
      console.log(`Removendo vídeo ${i} de ${removalStatus.total}`);
      removalStatus.removed = i;
      await new Promise((r) => setTimeout(r, 1000));
    }

    await browser.close();
    removalStatus.running = false;
    console.log("Remoção finalizada.");
  })();
});

app.get("/status", (req, res) => {
  res.json(removalStatus);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});


//testete