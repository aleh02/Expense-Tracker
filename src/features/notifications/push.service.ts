const PUSH_SERVER_URL = 'http://localhost:8080';

//convert VAPID key
function urlBase64ToUint8Array(base64Str: string) {
    const padding = '='.repeat((4 - (base64Str.length % 4)) % 4);
    const base64 = (base64Str + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
    return output;
}

//ask permission and subscribe
export async function enablePushNotifications(userId: string) {
    if (!('serviceWorker' in navigator)) throw new Error('Service worker not supported.');
    if (!('PushManager' in window)) throw new Error('Push not supported.');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Notification permission denied.');

    const reg = await navigator.serviceWorker.ready;

    const { publicKey } = await fetch(`${PUSH_SERVER_URL}/vapidPublicKey`).then(r => r.json());

    const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch(`${PUSH_SERVER_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription }),
    });

    return true;
}

//server push trigger (for budget alerts)
export async function sendBudgetAlert(
    userId: string, 
    payload: { title: string; body: string; url?: string }
) {
    await fetch(`${PUSH_SERVER_URL}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...payload }),
    });
}