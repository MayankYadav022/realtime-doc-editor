import React, { useRef, useEffect, useState } from 'react'
import Client from '../components/Clients'
import Editor from '../components/Editor';
import toast from 'react-hot-toast';
import { initSocket } from '../socket';
import { useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import ACTIONS from '../Actions';

const EditorPage = () => {

    const navigate = useNavigate();
    const { roomId } = useParams();
    const socketRef = useRef(null);
    const codeRef = useRef('');
    const location = useLocation();
    const [clients, setClients] = useState([]);
    const [socket, setSocket] = useState(null);


    useEffect(() => {
        const handleErrors = (e) => {
            console.log('socket error', e);
            toast.error('Socket connection failed , try again later');
            navigate('/');
        };

        const init = async () => {
            socketRef.current = await initSocket();
            setSocket(socketRef.current);
            socketRef.current.on('connect_error', handleErrors)
            socketRef.current.on('connect_failed', handleErrors)
            socketRef.current.on(ACTIONS.JOINED,
                ({ clients, username, socketId }) => {
                    if (username !== location.state?.username) {
                        toast.success(`${username} joined the room`);
                    }
                    setClients(clients);
                    socketRef.current.emit(ACTIONS.SYNC_CODE, {
                        code: codeRef.current,
                        socketId,
                    });
                });

            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,

            });

            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, username }) => {
                    toast.success(`${username} left the room`);
                    setClients((prev) => {
                        return prev.filter(client => client.socketId !== socketId);
                    })
                }
            );
        };
        init();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.off('connect_error', handleErrors);
                socketRef.current.off('connect_failed', handleErrors);
                socketRef.current = null;
            }
            setSocket(null);
        };
    }, [navigate, roomId, location.state?.username]);


    if (!location.state) {
        return <Navigate to='/' />
    }
    const copyRoomId = () => {
        try {
            navigator.clipboard.writeText(roomId);
            toast.success('Room ID copied to clipboard!');
        } catch (err) {
            toast.error('Failed to copy Room ID');
        }
    };

    const leaveRoom = () => {
        socketRef.current?.emit(ACTIONS.LEAVE, {
            roomId,
            username: location.state?.username,
        });
        socketRef.current?.disconnect();
        navigate('/');
    }

    return (
        <div className='mainWrap'>
            <div className='aside'>
                <div className='asideInner'>
                    <div className='logo'>
                        <img
                            className="logoImage"
                            src="/logo.png"
                            alt="logo-sync"
                        />
                    </div>
                    <h3 style={{textAlign:'center'}}>Connected</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <Client
                                key={client.socketId}
                                username={client.username}
                            />
                        ))}
                    </div>
                </div>
                <div className='btnGroup'>

                    <button className='btn copyBtn' onClick={copyRoomId}>Copy ROOM ID</button>
                    <button className='btn leaveBtn' onClick={leaveRoom}>Leave</button>
                </div>

            </div>

            <div className='editorWrap'>
                {socket && (
                    <Editor
                        socket={socket}
                        roomId={roomId}
                        username={location.state?.username}
                        onCodeChange={(code) => {
                            codeRef.current = code;
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default EditorPage;