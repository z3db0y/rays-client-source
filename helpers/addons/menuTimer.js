const { ipcRenderer } = require('electron');

module.exports = () => {
  const config = new (require('electron-store'))();
  if (!config.get('menuTimer', false)) return;

  const enableRecordingToggle = document.getElementById('record.enable');
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.bottom = '10px';
  overlay.style.right = '10px';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  overlay.style.color = 'white';
  overlay.style.padding = '10px';
  overlay.style.borderRadius = '5px';
  overlay.style.display = 'none';
  overlay.innerHTML = 'Game recording is on';

  document.body.appendChild(overlay);

  enableRecordingToggle.addEventListener('click', () => {
    overlay.style.display = enableRecordingToggle.checked ? 'block' : 'none';
  });
};