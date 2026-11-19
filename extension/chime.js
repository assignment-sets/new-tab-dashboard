const audio = new Audio('chime.wav');
chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.kind !== 'reminder-chime') return;
  audio.currentTime = 0;
  audio.play().then(() => respond(true), () => respond(false));
  return true;
});
