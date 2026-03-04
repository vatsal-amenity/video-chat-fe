import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Room, RoomEvent, Track, RemoteParticipant, Participant } from 'livekit-client';
import {
    Video as VideoIcon, Mic, MicOff, VideoOff, PhoneOff, Send,
    MessageSquare, MonitorUp, Hand, Users, Info, Copy, Check, Pin, PinOff, MonitorOff,
    Sparkles, Eraser, Loader2, ChevronUp, Check as CheckIcon, UserMinus
} from 'lucide-react';
import { BackgroundBlur, VirtualBackground } from '@livekit/track-processors';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';



const getEnv = (viteKey: string, reactKey: string) => {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[viteKey]) {
        return import.meta.env[viteKey];
    }
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[reactKey]) {
        // @ts-ignore
        return process.env[reactKey];
    }
    return undefined;
};

const LIVEKIT_URL = getEnv('VITE_LIVEKIT_URL', 'REACT_APP_LIVEKIT_URL') || "wss://videoapp-6l2a4ndg.livekit.cloud";

const TrackPlayer: React.FC<{
    track: Track | null;
    displayName: string;
    avatarName: string;
    isActiveSpeaker?: boolean;
    isPinned?: boolean;
    onPin?: () => void;
    isScreenShare?: boolean;
    hasRaisedHand?: boolean;
    isCameraOn?: boolean;
    isMicOn?: boolean;
}> = ({ track, displayName, avatarName, isActiveSpeaker, isPinned, onPin, isScreenShare, hasRaisedHand, isCameraOn = true, isMicOn = true }) => {
    const elRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

    useEffect(() => {
        if (elRef.current && track) {
            track.attach(elRef.current);
        }
        return () => {
            if (elRef.current && track) {
                track.detach(elRef.current);
            }
        };
    }, [track]);

    if (track?.kind === Track.Kind.Audio) {
        return <audio ref={elRef as React.RefObject<HTMLAudioElement>} autoPlay />;
    }

    return (
        <div className={`relative w-full h-full bg-white rounded-2xl overflow-hidden group shadow-sm transition-all duration-300 ${isActiveSpeaker ? 'ring-4 ring-primary-500' : 'border border-slate-200'}`}>
            {track && isCameraOn ? (
                <video
                    ref={elRef as React.RefObject<HTMLVideoElement>}
                    className={`absolute inset-0 w-full h-full ${isScreenShare ? 'object-contain bg-slate-900' : 'object-cover'}`}
                    autoPlay
                    playsInline
                    muted={false}
                />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-500">
                    <div className="w-24 h-24 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center mb-3 shadow-inner">
                        <span className="text-4xl font-semibold text-slate-400">{avatarName.charAt(0).toUpperCase()}</span>
                    </div>
                </div>
            )}

            {/* Overlay Info */}
            <div className="absolute bottom-4 left-4 flex gap-2 items-center z-10">
                <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 border border-slate-200 shadow-sm flex items-center gap-2">
                    {!isMicOn && <MicOff size={14} className="text-red-500" />}
                    {displayName} {isScreenShare && "(Presentation)"}
                </div>
                {hasRaisedHand && (
                    <div className="bg-amber-500 p-1.5 rounded-lg text-white shadow-lg">
                        <Hand size={16} />
                    </div>
                )}
            </div>

            {/* Pin Button */}
            {onPin && (
                <button
                    onClick={onPin}
                    className="absolute top-4 right-4 bg-white/80 hover:bg-white backdrop-blur-sm p-2 rounded-lg text-slate-700 border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title={isPinned ? "Unpin" : "Pin to screen"}
                >
                    {isPinned ? <PinOff size={18} /> : <Pin size={18} />}
                </button>
            )}
        </div>
    );
};

const VideoRoom: React.FC = () => {
    const navigate = useNavigate();
    const [room, setRoom] = useState<Room | null>(null);
    const [, setUpdateTick] = useState(0);

    // UI State
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Feature States
    const [pinnedTrackSid, setPinnedTrackSid] = useState<string | null>(null);
    const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
    const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
    const [activeSidebar, setActiveSidebar] = useState<'chat' | 'participants' | 'effects' | null>(null);
    const [showMeetingInfo, setShowMeetingInfo] = useState(false);
    const [copiedInfo, setCopiedInfo] = useState(false);

    // Device Popups
    const [showMicMenu, setShowMicMenu] = useState(false);
    const [showCamMenu, setShowCamMenu] = useState(false);
    const micMenuRef = useRef<HTMLDivElement>(null);
    const camMenuRef = useRef<HTMLDivElement>(null);

    // Device State
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [activeVideoId, setActiveVideoId] = useState<string>('');
    const [activeAudioId, setActiveAudioId] = useState<string>('');

    // Fetch Devices
    useEffect(() => {
        const getDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
                setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
            } catch (err) {
                console.error("Failed to enumerate devices", err);
            }
        };
        getDevices();
        navigator.mediaDevices.addEventListener('devicechange', getDevices);
        return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    }, []);

    // Click outside to close menus
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (micMenuRef.current && !micMenuRef.current.contains(event.target as Node)) setShowMicMenu(false);
            if (camMenuRef.current && !camMenuRef.current.contains(event.target as Node)) setShowCamMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Effects State
    const [activeEffect, setActiveEffect] = useState<'none' | 'blur-slight' | 'blur-full' | 'image'>('none');
    const [activeBgImage, setActiveBgImage] = useState<string | null>(null);
    const [isEffectLoading, setIsEffectLoading] = useState(false);
    const [effectsTab, setEffectsTab] = useState<'Backgrounds' | 'Filters' | 'Appearance'>('Backgrounds');
    const activeProcessorRef = useRef<any>(null);

    const availableBackgrounds = ['/backgrounds/bg1.png', '/backgrounds/bg2.png', '/backgrounds/bg3.png'];

    // Chat / Lobby
    const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [hasJoined, setHasJoined] = useState(false);
    const [participantName, setParticipantName] = useState('');
    const [roomName, setRoomName] = useState('');
    const forceUpdate = () => setUpdateTick(t => t + 1);

    const chatRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [messages]);

    const joinRoom = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!participantName.trim() || !roomName.trim()) {
            setError("Please enter both a Name and a Room ID");
            return;
        }

        setIsConnecting(true); setError(null); setHasJoined(true);
        console.log("[VideoRoom] joinRoom initiated", { participantName, roomName });

        try {
            let token = getEnv('VITE_LIVEKIT_TOKEN', 'REACT_APP_LIVEKIT_TOKEN');
            if (!token) {
                const response = await fetch('https://nonsolidified-annika-criminally.ngrok-free.dev/getToken', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                    body: JSON.stringify({
                        roomName: roomName,
                        participantName: participantName
                    })
                });
                if (!response.ok) throw new Error(`Failed to fetch token: ${response.status}`);
                token = (await response.json()).token;
            }

            if (!token) throw new Error("Token not found.");

            const newRoom = new Room({ adaptiveStream: true, dynacast: true });

            newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                console.log("[VideoRoom] TrackSubscribed:", track.kind, "from", participant.identity);
                forceUpdate();
            });
            newRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
                console.log("[VideoRoom] TrackUnsubscribed:", track.kind, "from", participant.identity);
                forceUpdate();
            });
            newRoom.on(RoomEvent.TrackMuted, (publication, participant) => {
                console.log("[VideoRoom] TrackMuted:", publication.kind, "from", participant.identity);
                forceUpdate();
            });
            newRoom.on(RoomEvent.TrackUnmuted, (publication, participant) => {
                console.log("[VideoRoom] TrackUnmuted:", publication.kind, "from", participant.identity);
                forceUpdate();
            });
            newRoom.on(RoomEvent.TrackPublished, (publication, participant) => {
                console.log("[VideoRoom] TrackPublished:", publication.kind, "from", participant.identity);
                forceUpdate();
            });
            newRoom.on(RoomEvent.TrackUnpublished, (publication, participant) => {
                console.log("[VideoRoom] TrackUnpublished:", publication.kind, "from", participant.identity);
                forceUpdate();
            });
            newRoom.on(RoomEvent.LocalTrackPublished, (publication, participant) => {
                console.log("[VideoRoom] LocalTrackPublished:", publication.kind);
                forceUpdate();
            });
            newRoom.on(RoomEvent.LocalTrackUnpublished, (publication, participant) => {
                console.log("[VideoRoom] LocalTrackUnpublished:", publication.kind);
                forceUpdate();
            });

            newRoom.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
                const text = new TextDecoder().decode(payload);
                try {
                    const data = JSON.parse(text);
                    if (data.type === 'RAISE_HAND') {
                        if (participant) setRaisedHands(prev => new Set(prev).add(participant.identity));
                    } else if (data.type === 'LOWER_HAND') {
                        if (participant) setRaisedHands(prev => { const n = new Set(prev); n.delete(participant.identity); return n; });
                    } else if (data.type === 'CHAT') {
                        setMessages(prev => [...prev, { sender: participant?.identity || 'Anonymous', text: data.message }]);
                    } else if (data.type === 'KICK_USER') {
                        // Check if the current user is the target
                        if (newRoom.localParticipant.identity === data.targetIdentity) {
                            newRoom.disconnect();
                            navigate('/auth/login');
                        }
                    }
                } catch {
                    // Fallback for old format
                    setMessages(prev => [...prev, { sender: participant?.identity || 'Anonymous', text }]);
                }
            });

            newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
                setActiveSpeakers(speakers.map(s => s.identity));
            });

            newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
                console.log("[VideoRoom] ParticipantConnected:", participant.identity);
                forceUpdate();
            });
            newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
                console.log("[VideoRoom] ParticipantDisconnected:", participant.identity);
                forceUpdate();
            });

            newRoom.on(RoomEvent.Disconnected, () => {
                console.log("[VideoRoom] Disconnected from room");
                setHasJoined(false); setActiveSidebar(null);
            });

            console.log("[VideoRoom] Connecting to LiveKit...", { url: LIVEKIT_URL });
            await newRoom.connect(LIVEKIT_URL, token);
            console.log("[VideoRoom] Connected successfully.");

            try { await newRoom.localParticipant.setMicrophoneEnabled(true); setIsMicOn(true); console.log("[VideoRoom] Local mic enabled"); } catch (e) { setIsMicOn(false); console.error("[VideoRoom] Local mic failed", e); }
            try {
                await newRoom.localParticipant.setCameraEnabled(true); setIsCameraOn(true); console.log("[VideoRoom] Local camera enabled");
            } catch (e) { setIsCameraOn(false); console.error("[VideoRoom] Local camera failed", e); }



            setRoom(newRoom); setIsConnecting(false);
        } catch (err: any) {
            setError(err.message || "Failed to connect.");
            setIsConnecting(false); setHasJoined(false);
        }
    };

    useEffect(() => { return () => { if (room) room.disconnect(); }; }, [room]);

    const toggleMic = async () => { if (!room) return; await room.localParticipant.setMicrophoneEnabled(!isMicOn); setIsMicOn(!isMicOn); };

    const applyEffect = async (effectType: 'none' | 'blur-slight' | 'blur-full' | 'image', imageUrl?: string) => {
        if (!room) return;

        setActiveEffect(effectType);
        if (imageUrl) setActiveBgImage(imageUrl);

        const localTrackPublication = room.localParticipant.getTrackPublication(Track.Source.Camera);
        const localTrack = localTrackPublication?.track as any;

        if (!localTrack) return; // If camera is off, we still saved the state to apply later

        setIsEffectLoading(true);
        try {
            if (activeProcessorRef.current) {
                if (typeof localTrack.stopProcessor === 'function') {
                    await localTrack.stopProcessor();
                } else {
                    await localTrack.setProcessor(undefined);
                }
                activeProcessorRef.current = null;
            }

            let newProcessor = null;
            if (effectType === 'blur-slight') {
                newProcessor = BackgroundBlur(5);
            } else if (effectType === 'blur-full') {
                newProcessor = BackgroundBlur(20);
            } else if (effectType === 'image' && imageUrl) {
                newProcessor = VirtualBackground(imageUrl);
            }

            if (newProcessor) {
                await localTrack.setProcessor(newProcessor);
                activeProcessorRef.current = newProcessor;
            }
        } catch (err) {
            console.error("Failed to apply effect:", err);
            // Revert state on failure
            setActiveEffect('none');
            setActiveBgImage(null);
        } finally {
            setIsEffectLoading(false);
        }
    };

    const toggleCamera = async () => {
        if (!room) return;
        if (isCameraOn) {
            await room.localParticipant.setCameraEnabled(false);
            setIsCameraOn(false);
        } else {
            await room.localParticipant.setCameraEnabled(true);
            setIsCameraOn(true);
            // Re-apply effect slightly after turning camera on
            if (activeEffect !== 'none') {
                setTimeout(() => {
                    applyEffect(activeEffect, activeBgImage || undefined);
                }, 300);
            }
        }
        forceUpdate();
    };

    const toggleScreenShare = async () => {
        if (!room) return;
        try {
            if (isScreenSharing) {
                await room.localParticipant.setScreenShareEnabled(false);
                setIsScreenSharing(false);
            } else {
                await room.localParticipant.setScreenShareEnabled(true);
                setIsScreenSharing(true);
            }
            forceUpdate();
        } catch (err) { console.error("Screen share error", err); }
    };

    const switchDevice = async (kind: 'videoinput' | 'audioinput', deviceId: string) => {
        if (!room) return;
        try {
            await room.switchActiveDevice(kind, deviceId);
            if (kind === 'videoinput') {
                setActiveVideoId(deviceId);
                setShowCamMenu(false);
            } else {
                setActiveAudioId(deviceId);
                setShowMicMenu(false);
            }
        } catch (err) {
            console.error("Failed to switch device", err);
        }
    };

    const toggleRaiseHand = async () => {
        if (!room) return;
        const identity = room.localParticipant.identity;
        const isRaised = raisedHands.has(identity);
        const payload = JSON.stringify({ type: isRaised ? 'LOWER_HAND' : 'RAISE_HAND' });
        try {
            await room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
            setRaisedHands(prev => { const n = new Set(prev); isRaised ? n.delete(identity) : n.add(identity); return n; });
        } catch (e) { console.error("Failed to raise hand"); }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!room || !chatInput.trim()) return;
        const payload = JSON.stringify({ type: 'CHAT', message: chatInput });
        try {
            await room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
            setMessages(prev => [...prev, { sender: 'You', text: chatInput }]); setChatInput('');
        } catch (err) { console.error('Failed to send message', err); }
    };

    const kickUser = async (targetIdentity: string) => {
        if (!room) return;
        const payload = JSON.stringify({ type: 'KICK_USER', targetIdentity });
        try {
            await room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
            // Since there's no backend state to boot them server-side immediately without token revocation,
            // we rely on the client listening to this and triggering a disconnect.
        } catch (err) { console.error('Failed to kick user', err); }
    };

    const copyMeetingInfo = () => {
        navigator.clipboard.writeText(`Join my meeting! Room ID: ${roomName}`);
        setCopiedInfo(true); setTimeout(() => setCopiedInfo(false), 2000);
    };

    if (!hasJoined) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                {/* Lobby UI from Original Component */}
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 border border-slate-200 shadow-xl rounded-2xl sm:px-10">
                        <div className="mb-6 text-center">
                            <h2 className="text-2xl font-bold text-slate-900">Join Video Room</h2>
                        </div>
                        {error && <div className="bg-red-50 text-red-600 rounded-xl p-3 mb-6 text-sm">{error}</div>}
                        <form className="space-y-6" onSubmit={joinRoom}>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Name</label>
                                <input value={participantName} onChange={(e) => setParticipantName(e.target.value)}
                                    className="w-full mt-1.5 px-4 py-2 border rounded-xl" placeholder="John Doe" disabled={isConnecting} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Room Code</label>
                                <input value={roomName} onChange={(e) => setRoomName(e.target.value)}
                                    className="w-full mt-1.5 px-4 py-2 border rounded-xl" placeholder="team-standup" disabled={isConnecting} />
                            </div>
                            <button type="submit" disabled={isConnecting || !participantName || !roomName}
                                className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50">
                                {isConnecting ? 'Joining...' : 'Join Room'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // Prepare tracks for rendering dynamically from LiveKit Room state
    const allTracks: any[] = [];
    const remoteAudioTracks: Track[] = [];
    const currentParticipantsList: { identity: string, isLocal: boolean, displayName: string, avatarName: string, isMicOn: boolean, hasRaisedHand: boolean, isHost?: boolean }[] = [];

    // Evaluate the true host outside of the loop so kick logic can securely know if we're host
    let trueHostIdentity: string | null = null;
    let amIHost = false;

    if (room) {
        // To determine the true host, we find the participant who joined first
        const allParticipants = [room.localParticipant, ...Array.from(room.remoteParticipants.values())];
        const hostParticipant = allParticipants.reduce((oldest, current) => {
            return (current.joinedAt?.getTime() || 0) < (oldest.joinedAt?.getTime() || 0) ? current : oldest;
        }, allParticipants[0]);

        trueHostIdentity = hostParticipant.identity;
        amIHost = room.localParticipant.identity === hostParticipant.identity;

        // Local Participant
        const localP = room.localParticipant;
        const localCamPub = localP.getTrackPublication(Track.Source.Camera);
        const localMicPub = localP.getTrackPublication(Track.Source.Microphone);
        const localScreenPub = localP.getTrackPublication(Track.Source.ScreenShare);

        const isCamOnState = localCamPub ? !localCamPub.isMuted : isCameraOn;
        const isMicOnState = localMicPub ? !localMicPub.isMuted : isMicOn;

        if (isCamOnState && localCamPub?.track) {
            allTracks.push({ track: localCamPub.track, sid: localCamPub.track.sid, participantIdentity: localP.identity, displayName: 'You', avatarName: localP.identity, isScreen: false, isLocal: true, isCameraOn: true, isMicOn: isMicOnState });
        } else {
            allTracks.push({ track: null, sid: 'local-video-off', participantIdentity: localP.identity, displayName: 'You', avatarName: localP.identity, isScreen: false, isLocal: true, isCameraOn: false, isMicOn: isMicOnState });
        }

        if (localScreenPub?.track && !localScreenPub.isMuted) {
            allTracks.push({ track: localScreenPub.track, sid: localScreenPub.track.sid, participantIdentity: localP.identity, displayName: 'Your Screen', avatarName: localP.identity, isScreen: true, isLocal: true, isCameraOn: true, isMicOn: true });
        }

        currentParticipantsList.push({
            identity: localP.identity,
            isLocal: true,
            displayName: 'You',
            avatarName: localP.identity,
            isMicOn: isMicOnState,
            hasRaisedHand: raisedHands.has(localP.identity),
            isHost: localP.identity === hostParticipant.identity
        });

        // Remote Participants
        room.remoteParticipants.forEach((p) => {
            const camPub = p.getTrackPublication(Track.Source.Camera);
            const micPub = p.getTrackPublication(Track.Source.Microphone) || Array.from(p.audioTrackPublications.values())[0];
            const screenPub = p.getTrackPublication(Track.Source.ScreenShare);

            const pIsCamOn = camPub && !camPub.isMuted && camPub.track;
            let pIsMicOn = micPub ? !micPub.isMuted : false;

            // LiveKit Agents usually connect with an identity like "agent_x" or "job_x", fallback properly
            const isAgent = p.identity.toLowerCase().startsWith('agent') || p.identity.toLowerCase().startsWith('job_');
            const displayNm = p.name || (isAgent ? 'AI Assistant' : p.identity);

            if (isAgent) {
                pIsMicOn = true; // Always show AI assistant mic as ON
                console.log("[VideoRoom] Agent detected:", p.identity, "mic forced ON. (Track exists?", !!micPub?.track, ")");
            }

            console.log(`[VideoRoom] Processing remote participant ${p.identity}:`, { pIsCamOn, pIsMicOn, isAgent });

            if (pIsCamOn && camPub.track) {
                allTracks.push({ track: camPub.track, sid: camPub.track.sid, participantIdentity: p.identity, displayName: displayNm, avatarName: displayNm, isScreen: false, isLocal: false, isCameraOn: true, isMicOn: pIsMicOn });
            } else {
                allTracks.push({ track: null, sid: `remote-video-off-${p.identity}`, participantIdentity: p.identity, displayName: displayNm, avatarName: displayNm, isScreen: false, isLocal: false, isCameraOn: false, isMicOn: pIsMicOn });
            }

            if (screenPub && screenPub.track && !screenPub.isMuted) {
                allTracks.push({ track: screenPub.track, sid: screenPub.track.sid, participantIdentity: p.identity, displayName: `${displayNm}'s Screen`, avatarName: displayNm, isScreen: true, isLocal: false, isCameraOn: true, isMicOn: true });
            }

            if (micPub && micPub.track && !micPub.isMuted) {
                remoteAudioTracks.push(micPub.track);
                console.log("[VideoRoom] Remote audio track pushed for:", p.identity);
            } else if (isAgent) {
                console.log("[VideoRoom] AI Agent missing unmuted audio track.", { hasMicPub: !!micPub, track: !!micPub?.track, isMuted: micPub?.isMuted });
            }

            currentParticipantsList.push({
                identity: p.identity,
                isLocal: false,
                displayName: displayNm,
                avatarName: displayNm,
                isMicOn: pIsMicOn,
                hasRaisedHand: raisedHands.has(p.identity),
                isHost: p.identity === hostParticipant.identity
            });
        });
    }

    const primaryTrack = allTracks.find(t => t.sid === pinnedTrackSid) || allTracks.find(t => t.isScreen);
    const secondaryTracks = allTracks.filter(t => t !== primaryTrack);

    const isLocalIdentity = (identity: string) => identity === room?.localParticipant.identity || identity === 'You' || identity === 'Your Screen';

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
            {room && (
                <LiveKitRoom room={room as any} style={{ position: 'absolute', pointerEvents: 'none', zIndex: 60, width: '100%', height: '100%' }}>
                    <RoomAudioRenderer />
                </LiveKitRoom>
            )}

            {/* Manual Hidden Audio Players for all participants (including Agents) */}
            {remoteAudioTracks.map(t => <TrackPlayer key={t.sid} track={t} displayName="audio" avatarName="audio" />)}

            <div className="flex-1 flex flex-col relative pb-24">
                {/* Header Navbar */}
                <div className="px-6 py-4 flex justify-between items-center pointer-events-none z-10 absolute top-0 w-full">
                    <div className="bg-white/90 backdrop-blur-md pointer-events-auto px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
                        <div className="font-semibold text-slate-800 text-lg">{isConnecting ? 'Connecting...' : `Room: ${room?.name || roomName}`}</div>
                        <div className="h-4 w-px bg-slate-300"></div>
                        <button onClick={() => setShowMeetingInfo(!showMeetingInfo)} className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-500">
                            <Info size={20} />
                        </button>
                    </div>

                    {showMeetingInfo && (
                        <div className="absolute top-16 left-6 bg-white border border-slate-200 p-4 rounded-xl shadow-xl pointer-events-auto w-72">
                            <h3 className="font-semibold text-slate-800 mb-2">Meeting Ready</h3>
                            <p className="text-sm text-slate-500 mb-4">Share this room code with others you want in the meeting.</p>
                            <div className="flex gap-2 bg-slate-50 p-2 rounded-lg text-sm border border-slate-200">
                                <span className="flex-1 truncate text-slate-700 font-medium">{roomName}</span>
                                <button onClick={copyMeetingInfo} className="text-primary-600 hover:text-primary-700">
                                    {copiedInfo ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Video Area */}
                <div className="flex-1 p-6 flex gap-4 overflow-hidden pt-20">
                    {primaryTrack ? (
                        <div className="flex-1 flex flex-col md:flex-row gap-4 h-full">
                            <div className="flex-1 h-full min-h-0">
                                <TrackPlayer
                                    track={primaryTrack.track}
                                    displayName={primaryTrack.displayName}
                                    avatarName={primaryTrack.avatarName}
                                    isScreenShare={primaryTrack.isScreen}
                                    isPinned={pinnedTrackSid === primaryTrack.sid}
                                    onPin={() => setPinnedTrackSid(pinnedTrackSid === primaryTrack.sid ? null : primaryTrack.sid)}
                                    isActiveSpeaker={activeSpeakers.includes(primaryTrack.participantIdentity)}
                                    hasRaisedHand={raisedHands.has(isLocalIdentity(primaryTrack.avatarName) ? (room?.localParticipant.identity || '') : primaryTrack.avatarName)}
                                    isCameraOn={primaryTrack.isCameraOn}
                                    isMicOn={primaryTrack.isMicOn}
                                />
                            </div>
                            <div className="w-full md:w-64 flex md:flex-col gap-4 overflow-x-auto md:overflow-y-auto no-scrollbar pb-2 md:pb-0 h-40 md:h-full shrink-0">
                                {secondaryTracks.map(t => (
                                    <div key={t.sid} className="w-48 md:w-full h-32 md:h-40 shrink-0">
                                        <TrackPlayer
                                            track={t.track}
                                            displayName={t.displayName}
                                            avatarName={t.avatarName}
                                            isScreenShare={t.isScreen}
                                            isPinned={pinnedTrackSid === t.sid}
                                            onPin={() => setPinnedTrackSid(t.sid)}
                                            isActiveSpeaker={activeSpeakers.includes(t.participantIdentity)}
                                            hasRaisedHand={raisedHands.has(isLocalIdentity(t.avatarName) ? (room?.localParticipant.identity || '') : t.avatarName)}
                                            isCameraOn={t.isCameraOn}
                                            isMicOn={t.isMicOn}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className={`flex-1 grid gap-4 auto-rows-fr place-items-center w-full h-full ${allTracks.length > 4 ? 'grid-cols-3' : allTracks.length > 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                            {allTracks.map(t => (
                                <div key={t.sid} className={`w-full h-full flex items-center justify-center min-h-[200px] ${allTracks.length === 1 ? 'max-w-5xl mx-auto aspect-video max-h-full' : ''}`}>
                                    <TrackPlayer
                                        track={t.track}
                                        displayName={t.displayName}
                                        avatarName={t.avatarName}
                                        isScreenShare={t.isScreen}
                                        isPinned={pinnedTrackSid === t.sid}
                                        onPin={() => setPinnedTrackSid(t.sid)}
                                        isActiveSpeaker={activeSpeakers.includes(t.participantIdentity)}
                                        hasRaisedHand={raisedHands.has(isLocalIdentity(t.avatarName) ? (room?.localParticipant.identity || '') : t.avatarName)}
                                        isCameraOn={t.isCameraOn}
                                        isMicOn={t.isMicOn}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Floating Bottom Control Bar */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-4 rounded-full border border-slate-200 shadow-xl flex items-center gap-3 z-50">

                    {/* Mic Toggle + Menu */}
                    <div className="relative flex items-center" ref={micMenuRef}>
                        <div className={`flex items-center rounded-full transition-colors overflow-hidden ${isMicOn ? 'bg-slate-100' : 'bg-red-50 text-red-600'}`}>
                            <button onClick={toggleMic} className={`p-4 hover:bg-black/5 transition-colors ${isMicOn ? 'text-slate-700' : 'text-red-600'}`} title={isMicOn ? "Turn off microphone" : "Turn on microphone"}>
                                {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
                            </button>
                            <button onClick={() => setShowMicMenu(!showMicMenu)} className={`py-4 px-2 hover:bg-black/5 transition-colors border-l ${isMicOn ? 'border-slate-200 text-slate-500 hover:text-slate-700' : 'border-red-200 text-red-400 hover:text-red-600'}`}>
                                <ChevronUp size={16} />
                            </button>
                        </div>

                        {showMicMenu && (
                            <div className="absolute bottom-full left-0 mb-3 w-64 bg-white border border-slate-200 shadow-xl rounded-xl py-2 overflow-hidden z-50">
                                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">Microphones</div>
                                <div className="max-h-60 overflow-y-auto py-1">
                                    {audioDevices.length > 0 ? audioDevices.map(device => (
                                        <button
                                            key={device.deviceId}
                                            onClick={() => switchDevice('audioinput', device.deviceId)}
                                            className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                                        >
                                            <span className="truncate pr-2">{device.label || 'Unknown Microphone'}</span>
                                            {activeAudioId === device.deviceId && <CheckIcon size={16} className="text-primary-600 shrink-0" />}
                                        </button>
                                    )) : (
                                        <div className="px-4 py-3 text-sm text-slate-400">No microphones found</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Camera Toggle + Menu */}
                    <div className="relative flex items-center" ref={camMenuRef}>
                        <div className={`flex items-center rounded-full transition-colors overflow-hidden ${isCameraOn ? 'bg-slate-100' : 'bg-red-50 text-red-600'}`}>
                            <button onClick={toggleCamera} className={`p-4 hover:bg-black/5 transition-colors ${isCameraOn ? 'text-slate-700' : 'text-red-600'}`} title={isCameraOn ? "Turn off camera" : "Turn on camera"}>
                                {isCameraOn ? <VideoIcon size={22} /> : <VideoOff size={22} />}
                            </button>
                            <button onClick={() => setShowCamMenu(!showCamMenu)} className={`py-4 px-2 hover:bg-black/5 transition-colors border-l ${isCameraOn ? 'border-slate-200 text-slate-500 hover:text-slate-700' : 'border-red-200 text-red-400 hover:text-red-600'}`}>
                                <ChevronUp size={16} />
                            </button>
                        </div>

                        {showCamMenu && (
                            <div className="absolute bottom-full left-0 mb-3 w-64 bg-white border border-slate-200 shadow-xl rounded-xl py-2 overflow-hidden z-50">
                                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">Cameras</div>
                                <div className="max-h-60 overflow-y-auto py-1">
                                    {videoDevices.length > 0 ? videoDevices.map(device => (
                                        <button
                                            key={device.deviceId}
                                            onClick={() => switchDevice('videoinput', device.deviceId)}
                                            className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                                        >
                                            <span className="truncate pr-2">{device.label || 'Unknown Camera'}</span>
                                            {activeVideoId === device.deviceId && <CheckIcon size={16} className="text-primary-600 shrink-0" />}
                                        </button>
                                    )) : (
                                        <div className="px-4 py-3 text-sm text-slate-400">No cameras found</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={() => setActiveSidebar(activeSidebar === 'effects' ? null : 'effects')} className={`p-4 rounded-full flex items-center justify-center transition-colors ${activeSidebar === 'effects' ? 'bg-primary-600 text-white shadow-lg' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 relative'}`} title="Background Effects">
                        <Sparkles size={22} />
                        {activeEffect !== 'none' && activeSidebar !== 'effects' && (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white"></span>
                        )}
                    </button>

                    <div className="w-px h-8 bg-slate-200 mx-1 md:mx-2"></div>

                    <button onClick={toggleScreenShare} className={`p-4 rounded-full flex items-center justify-center transition-colors ${isScreenSharing ? 'bg-primary-100 hover:bg-primary-200 text-primary-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`} title="Present Now">
                        {isScreenSharing ? <MonitorOff size={22} /> : <MonitorUp size={22} />}
                    </button>

                    <button onClick={toggleRaiseHand} className={`p-4 rounded-full flex items-center justify-center transition-colors ${raisedHands.has(room?.localParticipant.identity || '') ? 'bg-amber-100 hover:bg-amber-200 text-amber-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`} title="Raise Hand">
                        <Hand size={22} />
                    </button>

                    <div className="w-px h-8 bg-slate-200 mx-2"></div>

                    <button onClick={() => setActiveSidebar(activeSidebar === 'participants' ? null : 'participants')} className={`p-4 rounded-full flex items-center justify-center transition-colors ${activeSidebar === 'participants' ? 'bg-primary-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`} title="People">
                        <Users size={22} />
                    </button>

                    <button onClick={() => setActiveSidebar(activeSidebar === 'chat' ? null : 'chat')} className={`p-4 rounded-full flex items-center justify-center transition-colors ${activeSidebar === 'chat' ? 'bg-primary-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 relative'}`} title="Chat">
                        <MessageSquare size={22} />
                        {messages.length > 0 && activeSidebar !== 'chat' && (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary-500 rounded-full border-2 border-white"></span>
                        )}
                    </button>

                    <button onClick={() => { if (room) room.disconnect(); navigate('/auth/login'); }} className="ml-4 px-6 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium transition-colors shadow-lg shadow-red-500/20 flex items-center gap-2">
                        <PhoneOff size={20} />
                        <span className="hidden sm:inline">Leave</span>
                    </button>
                </div>
            </div>

            {/* Sidebar */}
            {activeSidebar && (
                <div className="w-80 md:w-96 border-l border-slate-200 bg-white flex flex-col z-40 transition-all shadow-xl">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                        <h2 className="font-semibold text-slate-800 text-lg">
                            {activeSidebar === 'chat' ? 'In-call messages' : activeSidebar === 'participants' ? 'People' : 'Background Effects'}
                        </h2>
                        <button onClick={() => setActiveSidebar(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                            &times;
                        </button>
                    </div>

                    {activeSidebar === 'effects' ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Preview Window */}
                            <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
                                <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative border border-slate-200 shadow-sm">
                                    {isCameraOn ? (
                                        allTracks.find(t => t.isLocal && !t.isScreen) ? (
                                            <div className="w-full h-full transform scale-x-[-1]">
                                                <TrackPlayer
                                                    track={allTracks.find(t => t.isLocal && !t.isScreen)?.track}
                                                    displayName=""
                                                    avatarName={room?.localParticipant.identity || 'You'}
                                                    isCameraOn={true}
                                                    isMicOn={true}
                                                />
                                            </div>
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-400">Loading preview...</div>
                                        )
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-800">
                                            <VideoOff size={24} className="mb-2 opacity-50" />
                                            <p className="text-sm">Camera is off</p>
                                        </div>
                                    )}
                                    {isEffectLoading && (
                                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-20">
                                            <div className="bg-white/90 p-3 rounded-xl shadow-xl flex items-center gap-3">
                                                <Loader2 size={20} className="text-primary-600 animate-spin" />
                                                <span className="text-sm font-medium text-slate-700">Applying...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-slate-200 px-2 shrink-0 bg-white">
                                {['Backgrounds', 'Filters', 'Appearance'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setEffectsTab(tab as any)}
                                        className={`flex-1 py-3 px-2 text-[13px] font-medium transition-colors border-b-2 ${effectsTab === tab ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto no-scrollbar p-4 bg-slate-50/30 space-y-6">
                                {effectsTab === 'Backgrounds' && (
                                    <>
                                        <div>
                                            <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3 px-1">No Effect</h3>
                                            <button
                                                onClick={() => applyEffect('none')}
                                                className={`flex items-center gap-3 w-full p-3 rounded-xl border ${activeEffect === 'none' ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-500' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300'} transition-all`}
                                            >
                                                <Eraser size={18} className={activeEffect === 'none' ? 'text-primary-600' : 'text-slate-400'} />
                                                <span className="font-medium text-sm">Remove effects</span>
                                            </button>
                                        </div>

                                        <div>
                                            <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3 px-1">Blur</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => applyEffect('blur-slight')}
                                                    className={`aspect-video rounded-xl border flex flex-col items-center justify-center gap-2 transition-all group overflow-hidden relative ${activeEffect === 'blur-slight' ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-slate-200 hover:border-slate-300'}`}
                                                >
                                                    <div className="absolute inset-0 bg-slate-100/50 backdrop-blur-[2px] z-10"></div>
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-200 to-slate-100 z-0"></div>
                                                    <div className="w-8 h-8 rounded-full bg-slate-300 z-20 group-hover:scale-105 transition-transform flex items-center justify-center">
                                                        <Users size={14} className="text-slate-500" />
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-700 z-20 bg-white/50 px-2 py-0.5 rounded-md mt-1">Slight blur</span>
                                                </button>
                                                <button
                                                    onClick={() => applyEffect('blur-full')}
                                                    className={`aspect-video rounded-xl border flex flex-col items-center justify-center gap-2 transition-all group overflow-hidden relative ${activeEffect === 'blur-full' ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-slate-200 hover:border-slate-300'}`}
                                                >
                                                    <div className="absolute inset-0 bg-slate-100/30 backdrop-blur-[6px] z-10"></div>
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-300 to-slate-200 z-0"></div>
                                                    <div className="w-8 h-8 rounded-full bg-slate-400 z-20 group-hover:scale-105 transition-transform flex items-center justify-center shadow-sm">
                                                        <Users size={14} className="text-white" />
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-800 z-20 bg-white/70 px-2 py-0.5 rounded-md mt-1">Full blur</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3 px-1">Images</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {availableBackgrounds.map((bg, idx) => (
                                                    <button
                                                        key={bg}
                                                        onClick={() => applyEffect('image', bg)}
                                                        className={`aspect-video rounded-xl border overflow-hidden transition-all group ${activeEffect === 'image' && activeBgImage === bg ? 'border-primary-500 ring-2 ring-primary-500 ring-offset-1' : 'border-slate-200 hover:border-slate-400 opacity-90 hover:opacity-100'}`}
                                                    >
                                                        <img src={bg} alt={`Background ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                                {effectsTab !== 'Backgrounds' && (
                                    <div className="h-40 flex flex-col items-center justify-center text-slate-400 space-y-3">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2">
                                            <Sparkles className="opacity-40 text-slate-500" size={24} />
                                        </div>
                                        <p className="text-sm font-medium text-slate-500">More options coming soon</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeSidebar === 'chat' ? (
                        <>
                            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                                        <MessageSquare className="opacity-30" size={40} />
                                        <p className="text-sm">Messages are visible to anyone in the call</p>
                                    </div>
                                ) : (
                                    messages.map((msg, i) => (
                                        <div key={i} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
                                            <span className="text-[11px] font-medium text-slate-500 mb-1 px-1">{msg.sender}</span>
                                            <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm border ${msg.sender === 'You' ? 'bg-primary-600 text-white border-primary-600 rounded-tr-sm' : 'bg-slate-50 text-slate-700 border-slate-100 rounded-tl-sm'}`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <form onSubmit={sendMessage} className="p-4 bg-white border-t border-slate-100">
                                <div className="relative flex items-center">
                                    <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Send a message..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-full py-2.5 pl-4 pr-12 text-sm text-slate-700 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors" />
                                    <button type="submit" disabled={!chatInput.trim()} className="absolute right-1.5 p-1.5 w-8 h-8 flex items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
                                        <Send size={14} className="-ml-0.5" />
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-2">
                            {currentParticipantsList.map((p, i) => (
                                <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold shadow-inner">
                                            {p.avatarName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-slate-800">{p.displayName}</p>
                                            <p className="text-xs text-slate-500">
                                                {p.isLocal ? 'You' : 'In call'}
                                                {p.isHost && <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary-100 text-primary-700 tracking-wide uppercase">Meeting Host</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {amIHost && !p.isLocal && (
                                            <button
                                                onClick={() => kickUser(p.identity)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Remove from call"
                                            >
                                                <UserMinus size={16} />
                                            </button>
                                        )}
                                        {p.hasRaisedHand && <Hand size={16} className="text-amber-500" />}
                                        {p.isMicOn ? <Mic size={16} className="text-slate-400" /> : <MicOff size={16} className="text-red-500" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VideoRoom;
