const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const verifyToken = require("../middeware/auth");
const { authorizeRoles } = require("../middeware/auth");
const imageDirectory = path.join(__dirname, "../uploads/portfolio");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }).single("image");
router.use("/images", express.static(imageDirectory, { dotfiles: "deny", setHeaders(res) { res.setHeader("X-Content-Type-Options", "nosniff"); } }));
router.post("/upload", verifyToken, authorizeRoles("admin"), (req, res) => {
    upload(req, res, async error => {
        if (error) return res.status(400).json({ message: "Choose one image up to 5 MB." });
        const b = req.file?.buffer;
        const ext = b?.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "png"
            : b?.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255 ? "jpg"
            : b?.length >= 12 && b.toString("ascii",0,4) === "RIFF" && b.toString("ascii",8,12) === "WEBP" ? "webp" : null;
        if (!ext) return res.status(400).json({ message: "Choose a JPEG, PNG or WebP image." });
        try {
            await fs.mkdir(imageDirectory, { recursive: true });
            const filename = `${crypto.randomUUID()}.${ext}`;
            await fs.writeFile(path.join(imageDirectory, filename), b, { flag: "wx" });
            return res.status(201).json({ image: `/api/portfolio/images/${filename}` });
        } catch { return res.status(500).json({ message: "Unable to upload image." }); }
    });
});

const {
    getPortfolio,
    addPortfolio,
    updatePortfolio,
    deletePortfolio
} = require("../controllers/portfolioController");

router.get("/", getPortfolio);
router.get("/:id", getPortfolio);
router.post("/", addPortfolio);
router.put("/:id", updatePortfolio);
router.delete("/:id", deletePortfolio);

module.exports = router;
