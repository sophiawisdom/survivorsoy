import { useEffect, useState, useRef } from 'react';
import './App.css';

import Admin from "./Admin.js"

import Select from 'react-select'

const server = "http://sophia.local:3030";

/**
 * Here's what I want:
 * 1. Support for people to add their names in with an API
 * 2. Retrieve a list of other people's names
 * 3. Support for voting
 * 4. Support on the server side for voting people out
 * 5. Support on the admin side to send everyone a notification
 * 6. Support on the admin side to open a vote with a time period
 * 7. Support on the admin side to extend or shorten voting
 * 8. Support for challenges like trivia
 * 9. Support for tribes and admin choosing who wins and loses.
 */

function App() {
  const [userId, setUserId] = useState(window.localStorage.getItem("userId") === null ? null : parseInt(window.localStorage.getItem("userId"))); // if the user has visited, userId !== null
  const [username, setUsername] = useState(window.localStorage.getItem("username"));
  const [users, setUsers] = useState(null); // should be null
  const [votes, setVotes] = useState(null);
  const requestInFlight = useRef(null);

  const now = parseInt(Date.now()/1000);
  const voteCurrently = votes !== null ? votes.filter(vote => vote.start <= now && vote.end >= now)[0] : undefined;
  console.log("voteCurrently: ", voteCurrently);

  console.log("userId", userId);
  console.log("username", username);

  let adminUI = null;
  const [duration, setDuration] = useState(30);
  if (window.location.pathname === "/sophia_admin") {
    adminUI = <div>
      <button onClick={() => {
        const now = parseInt(Date.now()/1000);
        fetch(`${server}/create_vote`, {"method": "POST", "headers": {"content-type": "application/json"}, "body": JSON.stringify({"start": now, "end": now+duration, voters: users.map(user => user.id)})})
      }}> Start Vote </button>
      <input type="number" onChange={e => setDuration(parseInt(e.target.value))} value={duration} />
    </div>
  }

  useEffect(() => {
    const load = () => fetch(`${server}/users`).then(r => r.json()).then(setUsers)// .then(users => setUsers([{"name": "Sophia", "id": 24}, {"name": "sinclair", "id": 25}, {"name": "ryan", "id": 31}, {"name": "keri", "id": 28}])); // setUsers(users));
    const id = setInterval(load, 1000);
    load();
    return () => clearInterval(id);
  }, [userId]);

  useEffect(() => {
    const load = () => fetch(`${server}/votes`).then(r => r.json()).then(votes => {
      votes.sort((a, b) => a.start - b.start);
      setVotes(votes);
    });
    const id = setInterval(load, 1000);
    load();
    return () => clearInterval(id);
  }, [userId]);

  const [value, setValue] = useState(null);
  let usersStuff = null;
  if (users !== null) {
    let voteStuff = null;
    if (voteCurrently && userId !== null) {
      voteStuff = <>Vote!!!
      <ul>
        {users.map(user => <li key={user.id}><button onClick={() => {
          console.log("body: ", JSON.stringify({"by": userId, "for": user.id, "on": voteCurrently.id}));
          fetch(`${server}/vote`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({"by": parseInt(userId), "for": user.id, "on": voteCurrently.id})});
        }}> Vote for {user.name} </button></li>)}
      </ul>
      <Select placeholder="Sinclair" onChange={setValue} value={value} options={users.map(user => {
        return {value: user.id, label: user.name};
      })} />
      </>
    }
    usersStuff = <div>
      Users:
      <ul>
      {users.map(user => <li key={user.id}> {user.name} </li>)}
    </ul>

    {voteStuff}
    </div>;
  }

  let votesStuff = null;
  if (votes !== null && users !== null) {
    votesStuff = <div>
      Past Votes:
      <div>
        {votes.map(vote => {
          let votesForWho = new Map();
          vote.votes.forEach(voter_vote => {
            if (!votesForWho.has(voter_vote.to_user)) {
              votesForWho.set(voter_vote.to_user, 0);
            }
            votesForWho.set(voter_vote.to_user, votesForWho.get(voter_vote.to_user) + 1);
          });
          console.log("votes", vote, votesForWho);
          return <div>Vote #{vote.id}
          <br></br>
          Votes:
          {Array.from(votesForWho.entries()).map((v, k) => <div> {v} votes for user #{k} ({users[k].name}) </div>)}
          </div>
        })}
      </div>
    </div>
  }

  return (
    <div>
      <header>
        Welcome to Golden Gate Survivor, {username} ({userId})!
      </header>

      {adminUI}

      <div>
        <label htmlFor="user_input"> Input username: </label>
        <input type="text" id="user_input" onKeyDown={e => {
          if (e.key === "Enter") {
            if (userId === null && requestInFlight.current === null) {
              requestInFlight.current = true;
              fetch(`${server}/add_user`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({"name": e.target.value})}).then(r => r.text()).then(text => {
                setUsername(e.target.value);
                setUserId(parseInt(text));
                window.localStorage.setItem("userId", parseInt(text));
                window.localStorage.setItem("username", e.target.value);
                e.target.value = "";
              });
            } else if (userId !== null) {
              fetch(`${server}/edit_user/${userId}`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({"name": e.target.value, "deleted": "no"})}).then(r =>{
                setUsername(e.target.value);
                window.localStorage.setItem("username", e.target.value);
                e.target.value = "";
              });
            }
          }
        }} />
      </div>

      {usersStuff}

      {votesStuff}

    </div>
  );
}

export default App;
