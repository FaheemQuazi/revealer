// Node Reqs
const argv = require('minimist')(process.argv.slice(2));
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process')

// help menu
if (argv["h"] || argv["help"]) {
console.log(`
Revealer - RevealJS Presentation Assistant
------------------------------------------
This tool makes it easy to host a RevealJS presentation and simplifies the file structure required.

Command Format:
    revealer [-h|--help][--launch] [PRESENTATION.html]

    [-h|--help] : shows this help menu.
    [--launch] : launches the default browser and opens the presentation.
    [PRESENTATION.html] : specify a single presentation file.
        If no presentation is specified, a picker will appear to select one
        The picker won't appear if only a single presentation (.html) file is detected in the current directory
        If no presentation is detected, the program will error out.
`)
process.exit(0);
}


// Package Reqs
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { JSDOM } = require("jsdom");

// CWD + Find slide decks
const cwd = process.cwd();
var decks = [];

function scanFiles() {
    decks = [];
    filesInCWD = fs.readdirSync(cwd);
    for (const fi of filesInCWD) {
        if (fi.endsWith(".html")) {
            decks.push(fi);
        }
    }
}

// parse presentation arguments and find presentations on start
if (argv["_"].length > 0 && argv["_"][0].endsWith(".html")) {
    decks.push(argv["_"][0]);
} else {
    scanFiles();
    if (decks.length == 0) {
        console.error("no presentations detected or specified!");
        process.exit(1);
    } else {
        console.log(`Detected Presentations: ${decks}`);
    }
}


// Express Server
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// static resources pre-presentation
app.use('/socket.io/', express.static(path.join(__dirname, "node_modules/socket.io/client-dist")));
app.use('/static/', express.static(path.join(__dirname, "static")));

// presentation routes
app.get('/present/:deck', (req, res, next) => {
    if (req.params.deck.endsWith(".html") == false) {
        next();
        return;
    }
    console.log(`Presenting ${req.params.deck}`);
    const deck = fs.readFileSync(path.join(cwd, req.params.deck), 'utf8');
    const dom = new JSDOM(deck), doc = dom.window.document;
    var checkFragment = doc.querySelector("meta[name='revealer']");
    if (checkFragment != null) {
        // this is a presentation fragment, render with present.ejs
        let title = doc.querySelector("meta[name='title']");
        if (title !== null) { title = title.getAttribute("content"); }
        res.render('present', { 
            deck: deck, 
            title: title || "Revealer"
        });
    } else {
        // this is a full presentation, render as a full page
        // create script elements for socket.io and socket-client.js
        let socketjs = doc.createElement("script");
        socketjs.src = "/socket.io/socket.io.js";
        let scriptjs = doc.createElement("script");
        scriptjs.src = "/static/js/socket-client.js";
        // add to body
        doc.body.appendChild(socketjs);
        doc.body.appendChild(scriptjs);
        // send serialized dom after append
        res.send(dom.serialize());
    }
});
app.get('/', (req, res) => {
    if (decks.length > 1) {
        res.render('select', {
            decks: decks
        });
    } else {
        res.redirect(`/present/${decks[0]}`);
    }
})

// static presentation resources
app.use('/present/', express.static(path.join(__dirname, "node_modules/reveal.js")));
app.use('/present/', express.static(cwd));

const httpServer = createServer(app);

// Socket.IO server
const io = new Server(httpServer, { /* options */ });
var currentSlideData = {};
io.on("connection", (socket) => {
    console.log("user connect", socket.id);

    socket.on("slidechanged", (data) => {
        currentSlideData = data;
        socket.broadcast.emit("slidechanged", data);
        io.emit("updateText", data.notes); // For anything that just needs notes
    });

    socket.on("disconnect", () => {
        console.log("user disconnect", socket.id);
    });
    
    socket.emit("slidechanged", currentSlideData);
});

fs.watch(cwd, (eventType, filename) => {
    console.log("File change detected, refreshing...");
    io.emit("refresh");
});

// Start server
httpServer.listen(3000, "localhost", () => {
    console.log("Revealer is at", __dirname);
    console.log("Presentations are at", cwd);
    console.log("Ready! http://localhost:3000");
    if (argv["launch"]) {
        exec("open \"http://localhost:3000\"", (error, stdout, stderr) => {
            if (error) {
                console.log("Couldn't automatically open browser");
            }
        });
    }
});

// exit gracefully
process.on('SIGINT', () => {
    console.log("Shutting down...");
    io.emit("kill");
    process.exit(0);
});
