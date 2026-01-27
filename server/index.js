import express from 'express';
import cors from 'cors';
import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

//in-memory store (or later: JSON file for persistence)
const subscriptionsByUser = new Map();  //userId : PushSubscription

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

app.get('/vapidPublicKey', (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

//save user subscription
app.post('/subscribe', (req, res) => {
    const { userId, subscription } = req.body;
    if (!userId || !subscription) {
        return res.status(400).json({ error: 'Missing userId or subscription.' });
    }
    const existed = subscriptionsByUser.has(userId);
    subscriptionsByUser.set(userId, subscription);
    return res.status(existed ? 200 : 201).json({ ok: true });  //200 if updated
});

//send push notification to user
app.post('/notify', async (req, res) => {
    const { userId, title, body, url } = req.body;

    const sub = subscriptionsByUser.get(userId);
    if(!sub) {
        return res.status(404).json({ error: 'No subscription for this user.' });
    }

    const payload = JSON.stringify({
        title: title || 'Expense Tracker',
        body: body || 'Notification',
        url: url || '/app/dashboard',
    });

    try {
        await webpush.sendNotification(sub, payload);   //await for single notification
        console.log(`Push Server - Notification sent to ${sub.endpoint}`);
        return res.status(200).json({ ok: true });
    } catch (err) {
        //remove subscription if expired/invalid
        subscriptionsByUser.delete(userId);
        console.error(err);
        return res.status(500).json({ error: 'Failed to send notification.' });
    }
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
    console.log(`Push server running on http://localhost:${port}`);
});