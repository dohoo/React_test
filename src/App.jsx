import React, { useState, useEffect, useRef } from "react";

// Debounce Hook
function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

// 플레이리스트 카드
function PlaylistCard({ playlist, onClick }) {
  const songs = Array.isArray(playlist.songs) ? playlist.songs : [];
  return (
    <div
      style={{ aspectRatio: "3/4" }}
      className="rounded-2xl flex flex-col items-center justify-center bg-neutral-800 border-2 border-rose-400/60 shadow-md cursor-pointer hover:border-rose-400 transition w-full min-w-0"
      onClick={onClick}
    >
      <img
        src={songs[0]?.artworkUrl100 || ""}
        alt="앨범커버"
        className="w-20 h-20 rounded-xl object-cover mb-2"
      />
      <div className="font-bold text-base text-white mb-1 line-clamp-1">
        {playlist.title || "나만의 플레이리스트"}
      </div>
      <div className="text-neutral-400 text-xs line-clamp-2 text-center">
        {songs.slice(0, 2).map(s => s.trackName).join(", ")}
        {songs.length > 2 ? " 외 +" + (songs.length - 2) + "곡" : ""}
      </div>
    </div>
  );
}

export default function App() {
  // ------ Main 상태 ------
  const [mode, setMode] = useState("list");
  const [playlists, setPlaylists] = useState([]);
  const [search, setSearch] = useState("");
  const [songs, setSongs] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const audioRef = useRef(null);
  const selectedScrollRef = useRef(null);

  // ------ 상세/수정 모드용 ------
  const [detailIndex, setDetailIndex] = useState(null);
  const [editSongs, setEditSongs] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (typeof mode === "object" && mode.mode === "detail") {
      setDetailIndex(mode.index);
      const pl = playlists[mode.index] || { songs: [] };
      setEditSongs(Array.isArray(pl.songs) ? pl.songs : []);
      setIsEditing(false);
    }
  }, [mode, playlists]);

  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    if (mode !== "select") return;
    if (!debouncedSearch) {
      setSongs([]);
      setOffset(0);
      setHasMore(false);
      return;
    }
    fetchSongs(debouncedSearch, 0, true);
  }, [debouncedSearch, mode]);

  async function fetchSongs(q, newOffset = 0, replace = false) {
    setLoading(true);
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=10&offset=${newOffset}`;
    const res = await fetch(url);
    const data = await res.json();
    setLoading(false);
    setHasMore(data.resultCount === 10);
    if (replace) {
      setSongs(data.results);
      setOffset(10);
    } else {
      setSongs(prev => [...prev, ...data.results]);
      setOffset(prev => prev + 10);
    }
  }
  function loadMore() {
    fetchSongs(debouncedSearch, offset, false);
  }

  function playPreview(url) {
    if (previewUrl === url) {
      setPreviewUrl("");
      return;
    }
    setPreviewUrl(url);
    setTimeout(() => {
      setPreviewUrl("");
    }, 15000);
  }

  function toggleSong(song) {
    if (selected.find(s => s.trackId === song.trackId)) {
      setSelected(selected.filter(s => s.trackId !== song.trackId));
    } else {
      setSelected([...selected, song]);
    }
  }
  function removeSong(trackId) {
    setSelected(selected.filter(s => s.trackId !== trackId));
  }

  function onDragScroll(e) {
    const el = selectedScrollRef.current;
    if (!el) return;
    let startX = e.pageX || e.touches?.[0].pageX;
    const scrollLeft = el.scrollLeft;
    function move(ev) {
      const x = ev.pageX || ev.touches?.[0].pageX;
      el.scrollLeft = scrollLeft - (x - startX);
    }
    function stop() {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", stop);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchmove", move);
    window.addEventListener("touchend", stop);
  }

  function handleMakePlaylist() {
    if (selected.length === 0) return;
    setPlaylists([{ title: "", songs: selected }, ...playlists]);
    setSelected([]);
    setSearch("");
    setMode("list");
  }

  function handleUpdatePlaylist(idx, newSongs) {
    const next = [...playlists];
    next[idx] = { ...next[idx], songs: newSongs };
    setPlaylists(next);
    setMode("list");
  }

  const [addSearch, setAddSearch] = useState("");
  const addDebouncedSearch = useDebounce(addSearch);
  const [addSongs, setAddSongs] = useState([]);
  const [addOffset, setAddOffset] = useState(0);
  const [addHasMore, setAddHasMore] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    if (!isEditing || !addDebouncedSearch) {
      setAddSongs([]);
      setAddOffset(0);
      setAddHasMore(false);
      return;
    }
    fetchAddSongs(addDebouncedSearch, 0, true);
  }, [addDebouncedSearch, isEditing]);

  async function fetchAddSongs(q, newOffset = 0, replace = false) {
    setAddLoading(true);
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=10&offset=${newOffset}`;
    const res = await fetch(url);
    const data = await res.json();
    setAddLoading(false);
    setAddHasMore(data.resultCount === 10);
    if (replace) {
      setAddSongs(data.results);
      setAddOffset(10);
    } else {
      setAddSongs(prev => [...prev, ...data.results]);
      setAddOffset(prev => prev + 10);
    }
  }

  function handleRemove(idx) {
    setEditSongs(editSongs.filter((_, i) => i !== idx));
  }
  function handleAdd(song) {
    if (!editSongs.find(s => s.trackId === song.trackId))
      setEditSongs([...editSongs, song]);
  }

  // --- UI ---

  if (mode === "list") {
    const gridCards = [
      <div
        key="add"
        style={{ aspectRatio: "3/4" }}
        className="rounded-2xl flex flex-col items-center justify-center bg-neutral-800 border-2 border-rose-400/60 shadow-md cursor-pointer hover:border-rose-400 transition w-full min-w-0"
        onClick={() => setMode("select")}
      >
        <button className="flex flex-col items-center pointer-events-auto">
          <span className="text-5xl text-rose-400 mb-3">＋</span>
          <span className="text-base text-white font-semibold">새 플레이리스트 만들기</span>
        </button>
      </div>,
      ...(Array.isArray(playlists) ? playlists : []).map((pl, i) => (
        <PlaylistCard
          key={i}
          playlist={pl}
          onClick={() => setMode({ mode: "detail", index: i })}
        />
      )),
    ];
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center py-6 px-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-screen-sm md:max-w-2xl">
          {gridCards}
        </div>
      </div>
    );
  }

  if (typeof mode === "object" && mode.mode === "detail") {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center py-6 px-2">
        <div className="w-full max-w-screen-sm md:max-w-xl mb-4 flex items-center">
          <button
            onClick={() => setMode("list")}
            className="mr-3 px-3 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-sm"
          >
            ← 목록
          </button>
          <div className="flex-1 font-bold text-lg">플레이리스트</div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="ml-2 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-sm"
            >
              수정
            </button>
          )}
          {isEditing && (
            <button
              onClick={() => {
                handleUpdatePlaylist(detailIndex, editSongs);
              }}
              className="ml-2 px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-sm"
            >
              저장
            </button>
          )}
        </div>
        {/* 곡 목록 */}
        <div className="w-full max-w-screen-sm md:max-w-xl">
          <div className="grid grid-cols-1 gap-2">
            {editSongs.map((song, idx) => (
              <div
                key={song.trackId}
                className="flex items-center p-2 rounded-xl bg-neutral-800 relative"
              >
                <img
                  src={song.artworkUrl60}
                  alt={song.trackName}
                  className="w-12 h-12 rounded-md object-cover"
                  onClick={() => playPreview(song.previewUrl)}
                  style={{ cursor: "pointer" }}
                />
                <div className="ml-3 flex-1">
                  <div className="font-bold text-base">{song.trackName}</div>
                  <div className="text-sm text-neutral-400">{song.artistName}</div>
                  <div className="text-xs text-neutral-500">{song.collectionName}</div>
                </div>
                {isEditing && (
                  <button
                    className="absolute top-2 right-2 text-neutral-400 hover:text-rose-400"
                    onClick={() => handleRemove(idx)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        {/* 곡 추가 */}
        {isEditing && (
          <div className="w-full max-w-screen-sm md:max-w-xl mt-4">
            <div className="mb-2 flex">
              <input
                className="flex-1 p-2 rounded-xl bg-neutral-700 outline-none"
                placeholder="추가할 곡 검색"
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
              />
              <button
                className="ml-2 px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-sm hover:bg-neutral-700"
                onClick={() => setAddSearch("")}
              >
                초기화
              </button>
            </div>
            {addSongs.map(song => (
              <div
                key={song.trackId}
                className="flex items-center p-2 rounded-xl hover:bg-neutral-800"
              >
                <img
                  src={song.artworkUrl60}
                  alt={song.trackName}
                  className="w-10 h-10 rounded-md object-cover"
                  onClick={() => playPreview(song.previewUrl)}
                  style={{ cursor: "pointer" }}
                />
                <div className="ml-3 flex-1">
                  <div className="font-bold text-base">{song.trackName}</div>
                  <div className="text-sm text-neutral-400">{song.artistName}</div>
                </div>
                <button
                  className="ml-2 px-2 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-xs"
                  onClick={() => handleAdd(song)}
                  disabled={editSongs.find(s => s.trackId === song.trackId)}
                >
                  추가
                </button>
              </div>
            ))}
            {addHasMore && (
              <button
                className="w-full mt-2 py-2 bg-neutral-800 rounded-2xl text-white text-base hover:bg-neutral-700 transition"
                onClick={() => fetchAddSongs(addDebouncedSearch, addOffset, false)}
                disabled={addLoading}
              >
                {addLoading ? "로딩 중..." : "더보기"}
              </button>
            )}
          </div>
        )}
        {previewUrl && (
          <audio
            src={previewUrl}
            autoPlay
            ref={audioRef}
            onEnded={() => setPreviewUrl("")}
            className="hidden"
          />
        )}
      </div>
    );
  }

  // 곡 선택 화면
  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center pt-12 pb-36 px-1">
      <div className="w-full max-w-screen-sm md:max-w-xl flex mb-2">
        <button
          onClick={() => {
            setMode("list");
            setSelected([]);
            setSearch("");
          }}
          className="mr-2 px-3 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-sm"
        >
          ← 목록
        </button>
        <input
          autoFocus
          className="flex-1 p-4 rounded-2xl bg-neutral-800 text-lg outline-none"
          placeholder="노래, 아티스트, 앨범명으로 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="w-full max-w-screen-sm md:max-w-xl space-y-2">
        {songs.map(song => (
          <div
            key={song.trackId}
            className={`flex items-center p-2 rounded-2xl hover:bg-neutral-800 transition group ${
              selected.find(s => s.trackId === song.trackId)
                ? "border-2 border-rose-400"
                : ""
            }`}
          >
            <div
              className="w-16 h-16 rounded-xl overflow-hidden cursor-pointer flex-shrink-0 relative"
              onClick={() => playPreview(song.previewUrl)}
            >
              <img
                src={song.artworkUrl100.replace("100x100bb", "200x200bb")}
                alt={song.collectionName}
                className="w-full h-full object-cover"
              />
              {previewUrl === song.previewUrl && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                </div>
              )}
            </div>
            <div
              className="flex-1 ml-4 cursor-pointer"
              onClick={e => {
                if (e.target.tagName === "IMG") return;
                toggleSong(song);
              }}
            >
              <div className="font-bold text-base line-clamp-1">{song.trackName}</div>
              <div className="text-sm text-neutral-400 line-clamp-1">{song.artistName}</div>
              <div className="text-xs text-neutral-500 line-clamp-1">{song.collectionName}</div>
            </div>
            {selected.find(s => s.trackId === song.trackId) && (
              <span className="text-rose-400 font-bold text-xl px-2">✔</span>
            )}
          </div>
        ))}
        {hasMore && (
          <button
            className="w-full mt-2 py-2 bg-neutral-800 rounded-2xl text-white text-base hover:bg-neutral-700 transition"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? "로딩 중..." : "더보기"}
          </button>
        )}
      </div>
      {previewUrl && (
        <audio
          src={previewUrl}
          autoPlay
          ref={audioRef}
          onEnded={() => setPreviewUrl("")}
          className="hidden"
        />
      )}
      {/* 선택곡 바 */}
      {selected.length > 0 && (
        <div className="fixed bottom-4 left-0 right-0 flex justify-center pointer-events-none z-30">
          <div
            className="bg-neutral-800 border border-neutral-700 rounded-2xl shadow-xl px-2 py-3 flex max-w-full w-full sm:max-w-screen-sm md:max-w-xl pointer-events-auto overflow-x-auto space-x-2"
            ref={selectedScrollRef}
            style={{ cursor: "grab", WebkitOverflowScrolling: "touch" }}
            onMouseDown={onDragScroll}
            onTouchStart={onDragScroll}
          >
            {selected.map(song => (
              <div
                key={song.trackId}
                className="relative w-16 h-16 flex-shrink-0 bg-neutral-700 rounded-xl flex items-center justify-center overflow-hidden"
              >
                <img
                  src={song.artworkUrl60}
                  alt={song.trackName}
                  className="w-full h-full object-cover"
                  onClick={() => playPreview(song.previewUrl)}
                  style={{ cursor: "pointer" }}
                />
                {previewUrl === song.previewUrl && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                  </div>
                )}
                <button
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs hover:bg-rose-500"
                  style={{ lineHeight: 1 }}
                  onClick={e => {
                    e.stopPropagation();
                    removeSong(song.trackId);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            className="ml-2 h-16 px-4 rounded-2xl bg-rose-500 text-white font-bold text-base shadow-lg hover:bg-rose-600 transition pointer-events-auto"
            onClick={handleMakePlaylist}
            disabled={selected.length === 0}
          >
            만들기
          </button>
        </div>
      )}
    </div>
  );
}

