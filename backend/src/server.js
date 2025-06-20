import express from "express";
import bodyParser from "body-parser";


const PORT = 3000;
export const app = express();
app.use(bodyParser.json());

app.use(express.static("static"));

app.get('/', (req, res) => {
  res.send('BoardShowdown API');
});

app.listen(PORT, (err) => {
  if (err) console.log(err);
  else console.log("Backend running on http://localhost:%s", PORT);
});
