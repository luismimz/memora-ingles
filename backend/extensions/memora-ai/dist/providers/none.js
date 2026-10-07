export const disabledTts = () => ({ name: 'none', enabled: false, async generate() { throw new Error('TTS no configurado'); }, async voices() { return []; } });
