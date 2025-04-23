// socket.js
import { io } from 'socket.io-client';
const socket = io('https://gc-backend-1ksm.onrender.com');
export default socket;
socket.on('connect', () => { console.log('Connected to the server'); });
