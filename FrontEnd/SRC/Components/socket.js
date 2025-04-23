// socket.js
import { io } from 'socket.io-client';
const socket = io('http://localhost:5000');
export default socket;
socket.on('connect', () => { console.log('Connected to the server'); });