"use client";

import { useEffect, useRef, useState } from 'react';

export default function useChatScroll(messages: unknown, conversationKey = '') {
  const feedRef = useRef<HTMLDivElement | null>(null);
  const followingLatest = useRef(true);
  const [showLatestButton, setShowLatestButton] = useState(false);

  useEffect(() => {
    followingLatest.current = true;
  }, [conversationKey]);

  useEffect(() => {
    const feed = feedRef.current;
    if (feed && followingLatest.current) {
      feed.scrollTo({ top: feed.scrollHeight, behavior: 'instant' });
    }
  }, [messages, conversationKey]);

  const onScroll = () => {
    const feed = feedRef.current;
    if (!feed) return;
    const nearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 48;
    followingLatest.current = nearBottom;
    setShowLatestButton(!nearBottom);
  };

  const scrollToLatest = () => {
    followingLatest.current = true;
    setShowLatestButton(false);
    const feed = feedRef.current;
    feed?.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
  };

  return { feedRef, onScroll, showLatestButton, scrollToLatest };
}
