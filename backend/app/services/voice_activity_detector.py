"""
Voice Activity Detection (VAD) - Knows when user is speaking
This is the KEY to natural conversation flow
"""

import numpy as np
import webrtcvad
import collections
import logging
from typing import Optional, Tuple
import struct

logger = logging.getLogger(__name__)

class VoiceActivityDetector:
    def __init__(self, sample_rate: int = 16000, frame_duration: int = 30):
        """
        Initialize VAD for detecting when user is speaking
        
        Args:
            sample_rate: Audio sample rate (16000 for high quality)
            frame_duration: Frame size in ms (10, 20, or 30)
        """
        self.sample_rate = sample_rate
        self.frame_duration = frame_duration
        self.vad = webrtcvad.Vad(2)  # Aggressiveness level 0-3
        
        # Buffer for smooth detection
        self.ring_buffer = collections.deque(maxlen=10)
        self.triggered = False
        self.voiced_frames = []
        
        # Silence detection
        self.silence_threshold = 0.8  # 80% of frames must be silent
        self.speech_threshold = 0.7   # 70% of frames must have speech
        
        logger.info("VAD initialized for natural conversation")
    
    def process_audio_chunk(self, audio_chunk: bytes) -> Tuple[bool, bool, Optional[bytes]]:
        """
        Process audio chunk and detect speech
        
        Returns:
            (is_speaking, speech_complete, accumulated_audio)
        """
        # Check if this frame contains speech
        is_speech = self.vad.is_speech(audio_chunk, self.sample_rate)
        
        self.ring_buffer.append(1 if is_speech else 0)
        
        # Calculate percentage of frames with speech
        num_voiced = sum(self.ring_buffer)
        percentage_voiced = num_voiced / len(self.ring_buffer)
        
        # State machine for speech detection
        if not self.triggered:
            # Start of speech detection
            if percentage_voiced > self.speech_threshold:
                self.triggered = True
                self.voiced_frames = [audio_chunk]
                logger.debug("Speech started")
                return (True, False, None)
        else:
            # Currently in speech
            self.voiced_frames.append(audio_chunk)
            
            # Check if speech has ended
            if percentage_voiced < self.silence_threshold:
                # Speech ended - return accumulated audio
                self.triggered = False
                complete_audio = b''.join(self.voiced_frames)
                self.voiced_frames = []
                logger.debug("Speech ended")
                return (False, True, complete_audio)
            else:
                # Still speaking
                return (True, False, None)
        
        # No speech detected
        return (False, False, None)
    
    def reset(self):
        """Reset VAD state for new conversation"""
        self.ring_buffer.clear()
        self.triggered = False
        self.voiced_frames = []