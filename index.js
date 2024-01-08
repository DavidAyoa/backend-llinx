import fs from "fs"
import express from "express"
import cors from "cors"
import { MongoClient } from "mongodb"
import axios from "axios"
import { v4 as uuidv4 } from 'uuid';
import { UAParser } from "ua-parser-js";

const app = express()
const port = process.env.PORT || 3000
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cors())

app.set("trust proxy", true)

const createUser = async (client, newUser) => {
    console.log(`New user created with id: ${userCreated.insertedId}`)
}

const listDatabases = async (client) => {
    console.log("Database:")

    const db = fs.readFileSync("./db.json", "utf8", (err, data) => {
        if (err) {
            console.log("error occured")
        }
        return data
    })
    console.log(db)
    
    dbs.databases.forEach((db) => console.log(" - ", db.name))
}

// if true, login, else ask to create new account
// create the new account by user choice

//Shorten Links **

// Analytics:
// ---
// Number of clicks
// ( excluding user ip )
// Device type with clicks with depth details (Device ->> Mobile ->> IOS )
// Countries with clicks
// ...if you can implement charts, go on
// websites your shortened link has been on / is on
// successful visits to target link

//Video by <a href="https://pixabay.com/users/bellergy-1846871/?utm_source=link-attribution&utm_medium=referral&utm_campaign=video&utm_content=1992">Bellergy RC</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=video&utm_content=1992">Pixabay</a>

// HANDLE USER ACCESS

// HANDLE URL SHORTENING

const generateRandomStr = () => {
    const randomStr = Math.random().toString(36).substring(2, 7);
    return randomStr;
}

app.post("/spring", (req, res) => {
    const data = req.body;
    const targetLink = data.toSpring;
    let database;

    const identifier = generateRandomStr();

    const linkObj = {
        targetUrl: targetLink,
        expires: 1690741014204,
        analytics: {
            "191.101.80.9": {
                "visits": null,
                "location": {
                    "country": "USA",
                    "city": "California"
                },
                "browser": "",
                "device": "",
                "timezone": ""
            }
        }
    };

    try {
        const host = req.headers.host;
        const rawData = fs.readFileSync("./db.json", "utf8");
        const existingData = JSON.parse(rawData);
        const existingUsers = existingData.users;
        const [existingKeyInDatabase, exisitingLink] = Object.entries(existingData).find(([key, link]) => link.targetUrl === targetLink) || [];
        const linkExistsInUsers = Object.fromEntries(Object.entries(existingUsers)
            .flatMap(([userId, user]) => 
                user.links ? 
                    Object.entries(user.links)
                        .filter(([linkKey, link]) => link.targetUrl === targetLink)
                        .map(([linkKey, link]) => [linkKey, link])
                    : []
            )
        );

        if ((typeof existingKeyInDatabase !== "undefined" && typeof exisitingLink !== "undefined") || (Object.keys(linkExistsInUsers).length > 0)) {
            
            res.json({
                springed: `http://${host}/${(typeof existingKeyInDatabase !== "undefined" && typeof exisitingLink !== "undefined") ? existingKeyInDatabase : Object.keys(linkExistsInUsers)}`
            })

            return;
        }

        existingData[identifier] = linkObj;
        database = existingData;

        fs.writeFileSync("./db.json", JSON.stringify(database, null, 2));

        res.json({
            springed: `http://${host}/${identifier}`
        });
    } catch (err) {
        console.log("Error occurred reading or writing to the database:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const getVisitDetails = async (req) => {
    let ipAddress;
    let geoData;
    const AgentParser = new UAParser(req.headers['user-agent']);
    var { browser, os } = AgentParser.getResult();

    try {
        ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || null;
        console.log("IP Address: ", ipAddress)
        if (typeof ipAddress === null) return {error: "Error Getting IP Address"}

        geoData = await axios.get(
            `https://ipinfo.io/${ipAddress}/json?token=ad573344f1c3a1`
        ).then(res => res.data)

    } catch (err) {
        console.log(err)
    }

    return {
        ip: ipAddress,
        location: {
            country: geoData.region,
            city: geoData.city,
            timezone: geoData.timezone
        },
        device: {
            os: os.name,
            browser: browser.name,
            // type: device.type,
            // asString: `${os.name} / ${browser.name} / ${device.type}`,
        },
    }
}

app.get("/:springId", (req, res) => {
    const springId = req.params.springId
    try {
        const rawData = fs.readFileSync("./db.json", "utf8");
        const existingData = JSON.parse(rawData);

        if (existingData[springId]) {
            const targetUrl = existingData[springId].targetUrl;
            res.send(getVisitDetails(req))
            // res.redirect(targetUrl)
        } else {
            res.send("Link not identified or link has expired :( ...")
        }
    } catch (err) {
        console.log("Error occurred reading or writing to the database:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

app.post("/access", (req, res) => {
    const data = req.body;

    try {
        const rawData = fs.readFileSync("./db.json", "utf8");
        const existingData = JSON.parse(rawData);

        const [userId, user] = Object.entries(existingData.users).find(([userId, user]) => user.name_email === data.name_email || user.password === data.password) || [];

        if (data.create) {
            const newUser = uuidv4();
            const emailRegex = /^(?=.*[a-zA-Z0-9._%+-]+@(?:gmail\.com|outlook\.com|hotmail\.com)$)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

            if (!existingData.users[newUser]) {
                existingData.users[newUser] = data.user
                if (emailRegex.test(data.user.name_email)) {
                    try {
                        fs.writeFileSync("./db.json", JSON.stringify(existingData, null, 2));
                        res.send("User successfully created")
                    } catch (err) {
                        res.status(500).send("Error creating user...")
                    }
                } else {
                    res.status(400).send("A valid gmail, outlook or hotmail address is required to create a new account!")
                }
            } else {
                res.status(422).send("Please try again, server encountered an ID creation conflict")
            }

        } else {
            if (userId !== undefined) {
                const searchResult = { [userId]: user };

                if (searchResult.name_email === data.name_email) {}
                res.json({ 
                    exists: true,
                    name_email: searchResult[userId].name_email === data.name_email,
                    password: searchResult[userId].password === data.password,
                    searchResult: (searchResult[userId].name_email === data.name_email && searchResult[userId].password === data.password) ? searchResult : null
                })
            } else {
                res.json({ exists: false })
            }
        }
    } catch (err) {
        console.log("Error occurred reading or writing to the database:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

// ANALYTICS

app.get("/", async (req, res) => {
        const client = new MongoClient(uri)

        await createUser(client, {
            name_email: "hitter",
            password: "except"
        })

        res.json("Nothing here to see :)")
})

app.post("/analytics", (req, res) => {
    const { name_email } = req.body
})

app.listen(port, () => console.log(`Listening...`))
