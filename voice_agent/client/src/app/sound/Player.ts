interface PlayerProps {
  audio: HTMLAudioElement;
}

interface Audio {
  chunk: string;
}

interface QueueItem {
  audio: Audio;
}

export class Player {
  private audioPacketQueue: QueueItem[] = [];
  private isPlaying = false;
  private audioElement!: HTMLAudioElement;
  private isInterrupted = false;

  preparePlayer(props: PlayerProps): void {
    this.audioElement = props.audio;
    this.audioElement.onended = () => {
      this.playQueue();
    };
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  stop() {
    this.audioElement.pause();
    this.audioElement.currentTime = 0;
    this.audioElement.src = '';
    this.audioPacketQueue = [];
    this.isPlaying = false;
    this.isInterrupted = false;
  }

  interrupt() {
    console.log('[Player] Interrupting audio playback');
    this.isInterrupted = true;
    this.audioElement.pause();
    this.audioElement.currentTime = 0;
    this.audioElement.src = '';
    this.audioPacketQueue = [];
    this.isPlaying = false;
  }

  resumeAfterInterruption() {
    console.log('[Player] Resuming after interruption');
    this.isInterrupted = false;
  }

  addToQueue(packet: QueueItem): void {
    // Don't add to queue if interrupted
    if (this.isInterrupted) {
      console.log('[Player] Ignoring audio packet due to interruption');
      return;
    }
    
    this.audioPacketQueue.push(packet);
    if (!this.isPlaying) {
      this.playQueue();
    }
  }

  clearQueue() {
    this.isPlaying = false;
    this.audioPacketQueue = [];
  }

  private playQueue = (): void => {
    // Don't play if interrupted
    if (this.isInterrupted) {
      console.log('[Player] Skipping playQueue due to interruption');
      this.isPlaying = false;
      this.audioElement.src = '';
      return;
    }

    if (!this.audioPacketQueue.length) {
      this.isPlaying = false;
      this.audioElement.src = '';
      return;
    }

    const currentPacket = this.audioPacketQueue.shift();

    this.isPlaying = true;
    this.audioElement.src =
      'data:audio/wav;base64,' + currentPacket?.audio?.chunk;
    this.audioElement.play().catch((e) => console.error(e));
  };
}
