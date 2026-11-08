import { Buffer } from 'buffer';

(globalThis as any).Buffer = (globalThis as any).Buffer || Buffer;

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);