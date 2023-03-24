const path = require('path');
const config = new (require('electron-store'))();
const { desktopCapturer, remote } = require('electron');
const fs = require('fs');
const { request } = require('http');
const fetch = require('node-fetch');

let source;
let mediaRecorder;
let recordedChunks = [];
let streams = {
	audio: null,
	video: null
};
const State = {
	STOPPED: 0,
	RECORDING: 1,
	PAUSED: 2
};

let state = State.STOPPED;
function startRecording() {
	if(state !== State.STOPPED) return;
	navigator.mediaDevices.getUserMedia({
		audio: (config.get('record.audio', false) ? true : false),
		video: {
			mandatory: {
				chromeMediaSource: 'desktop',
				chromeMediaSourceId: source.id
			}
		}
	}).then(s => {
		stream = s;
		state = State.RECORDING;
		mediaRecorder = new MediaRecorder(stream, {
			mimeType: 'video/x-matroska;codecs=avc1'
		});
		mediaRecorder.ondataavailable = e => {
			if(e.data.size > 0 && state === State.RECORDING) recordedChunks.push(e.data);
		};
	}).catch(err => {});
}

function pauseRecording() {
	if(state !== State.RECORDING) return;
	state = State.PAUSED;
}

async function stopRecording() {
	if(state === State.STOPPED) return;
	state = State.STOPPED;
	stream.active = false;
	mediaRecorder.stop();
	mediaRecorder = null;
	
	const blob = new Blob(recordedChunks, {
		type: 'video/x-matroska;codecs=avc1'
	});
	const buffer = Buffer.from(await blob.arrayBuffer());

	switch(config.get('record.output', 'file')) {
		case 'file':
			try {
				let dir = config.get('record.outputDirectory', path.join(remote.app.getPath('videos'), 'RAYS_Recordings'));
				if(!fs.existsSync(dir)) fs.mkdirSync(dir);
				let filename = new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/[/\\?%*:|"<>]/g, '-');
				fs.writeFileSync(path.join(dir, `${filename}.mkv`), buffer);
			} catch {}
			break;
		case 'webhook':
			try {
                let webhook = config.get('record.webhook', '');
                request = request(webhook, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                            
                    }
                });
                request.write(JSON.stringify({
                    content: 'New recording',
                    embeds: [{
                        title: 'New recording',
                        description: 'New recording',
                        fields: [{
                            name: 'File',
                            value: `**[Download](${path.join(dir, `${filename}.mkv`)})**`
                        }]
                    }]
                }));
			} catch {}
			break;
	}
}

module.exports = _ => {
	if(!config.get('record.enable', false)) return;
	desktopCapturer.getSources({
		types: ['window']
	}).then(async sources => {
		source = sources.find(source => source.name === remote.getCurrentWindow().getTitle());
		
	});
};