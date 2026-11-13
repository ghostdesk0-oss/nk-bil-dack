import { mount } from './wheel.js';
import { mount as mountCar } from '../car/car.js';
window.NKWheel = { mount };
window.NKCar = { mount: mountCar };
