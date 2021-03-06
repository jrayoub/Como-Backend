const express = require("express");
const Router = express.Router();
const fs = require("fs");
const { exec } = require("child_process");
const Config = require("../Config/Config");
const BaseUrl = Config.BaseUrl;
const assets = "public/Uploads/Video";
const videName = "VID_20210910_232105.mp4"; // without extension
///.mp4
const { getFileStream } = require("../s3");
const { Route53RecoveryCluster } = require("aws-sdk");

Router.get("/", (req, res) => {
  fs.access(assets + "/images/" + videName + ".jpg", fs.F_OK, (err) => {
    if (err) {
      exec(
        `bin/ffmpeg -i ${assets}/${videName}.mp4 -ss 00:00:04.00 -r 1 -an -vframes 1 -f mjpeg ${assets}/images/${videName}.jpg`,
        (error, stdout, stderr) => {
          if (error) {
            return;
          }

          res.render("index", {
            image: `/assets/images/${videName}.jpg`,
          });
        }
      );
    }

    if (err === null) {
      res.render("index", {
        image: `/assets/images/${videName}.jpg`,
      });
    }
  });
});

Router.get("/video", (req, res) => {
  const path = `${assets}/${req.query.videoName}`;

  fs.stat(path, (err, stat) => {
    // Handle file not found
    if (err !== null && err.code === "ENOENT") {
      res.sendStatus(404);
    }

    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");

      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      const chunksize = end - start + 1;
      const file = fs.createReadStream(path, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4",
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
      };

      res.writeHead(200, head);
      fs.createReadStream(path).pipe(res);
    }
  });
});

module.exports = Router;
