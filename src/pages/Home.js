import React, { useState } from 'react'
import { v4 as uuidV4 } from 'uuid'
import toast from 'react-hot-toast';
import {useNavigate } from 'react-router-dom';

const Home = () => {

    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('')

    const createNewRoom = (e) => {
        e.preventDefault();
        const id = uuidV4();
        setRoomId(id);
        toast.success('Created a new room')
    }

    const joinRoom = () => {
        if (!roomId || !username) {
            toast.error('Room Id or Username MISSING !');
            return;
        }

        //Redirect to page

        navigate(`/editor/${roomId}`, {
            state: {
                username,
            },
        });
    }

    const handleInputEnter =(e)=>{
        if(e.code==='Enter'){
            joinRoom();
        }
    }


    return (
        <div className="homePageWrapper">
            <div className="formWrapper">
                <img
                    className="homePageLogo"
                    src='/logo.png'
                    alt="logo-sync"
                />
                <h4 className="mainLabel" style={{ fontWeight: '500' }}>PASTE INVITATION ROOM ID</h4>

                <div className="inputGroup">
                    <input
                        type="text"
                        className="inputBox"
                        placeholder="ROOM ID"
                        onChange={(e) => setRoomId(e.target.value)}
                        value={roomId}
                        onKeyUp={handleInputEnter}
                    />
                    <input
                        type="text"
                        className="inputBox"
                        placeholder="USERNAME"
                        onChange={(e) => setUsername(e.target.value)}
                        value={username}
                        onKeyUp={handleInputEnter}
                    />
                    <button className="btn joinBtn" onClick={joinRoom}>
                        Join
                    </button>
                    <span className="createInfo">
                        Don't have invitation code, create one&nbsp;
                        <a onClick={createNewRoom} href="" className="createNewBtn">new room</a>

                    </span>
                </div>
            </div>
            <footer className='footer'>
                <h4>
                    Developer -&nbsp;
                    <a href="https://github.com/MayankYadav022">Mynk Ydv</a>
                </h4>
            </footer>
        </div>
    );
};
export default Home;