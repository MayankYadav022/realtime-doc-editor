import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import ACTIONS from '../Actions';

const Editor = ({ socket, roomId, username, onCodeChange }) => {
    const editorRef = useRef(null);
    const onCodeChangeRef = useRef(onCodeChange);
    const roomIdRef = useRef(roomId);
    const remoteCursorMarksRef = useRef({});
    const isApplyingRemoteChangeRef = useRef(false);
    const suppressCursorEmitUntilRef = useRef(0);

    useEffect(() => {
        onCodeChangeRef.current = onCodeChange;
        roomIdRef.current = roomId;
    }, [onCodeChange, roomId]);

    useEffect(() => {
        return () => {
            Object.values(remoteCursorMarksRef.current).forEach((mark) => mark.clear());
            remoteCursorMarksRef.current = {};
        };
    }, []);

    useEffect(() => {
        async function init() {
            editorRef.current = Codemirror.fromTextArea(
                document.getElementById('realtimeEditor'),
                {
                    mode: { name: 'javascript', json: true },
                    theme: 'dracula',
                    autoCloseTags: true,
                    autoCloseBrackets: true,
                    lineNumbers: true,
                }
            );

            editorRef.current.on('change', (instance, changes) => {
                const { origin } = changes;
                const code = instance.getValue();
                onCodeChangeRef.current?.(code);
                if (origin !== 'setValue' && socket) {
                    socket.emit(ACTIONS.CODE_CHANGE, {
                        roomId: roomIdRef.current,
                        code,
                    });
                }
            });

            editorRef.current.on('cursorActivity', (instance) => {
                if (!socket || isApplyingRemoteChangeRef.current) return;
                if (Date.now() < suppressCursorEmitUntilRef.current) return;

                const cursor = instance.getCursor();
                socket.emit(ACTIONS.CURSOR_MOVE, {
                    roomId: roomIdRef.current,
                    cursor,
                });
            });
        }
        init();

        return () => {
            if (editorRef.current) {
                editorRef.current.toTextArea();
                editorRef.current = null;
            }
        };
    }, [socket]);

    useEffect(() => {
        if (!socket) return;

        const handleCodeChange = ({ code }) => {
            if (code !== null && editorRef.current) {
                const currentCursor = editorRef.current.getCursor();
                suppressCursorEmitUntilRef.current = Date.now() + 120;
                isApplyingRemoteChangeRef.current = true;
                editorRef.current.setValue(code);
                const doc = editorRef.current.getDoc();
                const lastLine = doc.lastLine();
                const safeLine = Math.min(currentCursor.line, lastLine);
                const lineText = doc.getLine(safeLine) || '';
                const safeCh = Math.min(currentCursor.ch, lineText.length);
                doc.setCursor({ line: safeLine, ch: safeCh });
                isApplyingRemoteChangeRef.current = false;
                suppressCursorEmitUntilRef.current = Date.now() + 120;
            }
        };

        const handleCursorMove = ({ socketId, username: remoteUsername, cursor }) => {
            if (!editorRef.current || !cursor || socketId === socket.id) {
                return;
            }

            const oldMark = remoteCursorMarksRef.current[socketId];
            if (oldMark) {
                oldMark.clear();
            }

            const widget = document.createElement('span');
            widget.className = 'remote-cursor';

            const tag = document.createElement('span');
            tag.className = 'remote-cursor-tag';
            tag.textContent = remoteUsername || 'Guest';
            widget.appendChild(tag);

            const mark = editorRef.current.setBookmark(cursor, {
                widget,
                insertLeft: true,
            });
            remoteCursorMarksRef.current[socketId] = mark;
        };

        const handleUserDisconnected = ({ socketId }) => {
            const mark = remoteCursorMarksRef.current[socketId];
            if (mark) {
                mark.clear();
                delete remoteCursorMarksRef.current[socketId];
            }
        };

        socket.on(ACTIONS.CODE_CHANGE, handleCodeChange);
        socket.on(ACTIONS.CURSOR_MOVE, handleCursorMove);
        socket.on(ACTIONS.DISCONNECTED, handleUserDisconnected);

        return () => {
            socket.off(ACTIONS.CODE_CHANGE, handleCodeChange);
            socket.off(ACTIONS.CURSOR_MOVE, handleCursorMove);
            socket.off(ACTIONS.DISCONNECTED, handleUserDisconnected);
        };
    }, [socket, username]);

    return <textarea id="realtimeEditor"></textarea>;
};

export default Editor;