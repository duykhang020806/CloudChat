import React from 'react'

export const APPLE_EMOJI_MAP = {
  "😀": "1f600",
  "😃": "1f603",
  "😄": "1f604",
  "😁": "1f601",
  "😆": "1f606",
  "😅": "1f605",
  "😂": "1f602",
  "🤣": "1f923",
  "😊": "1f60a",
  "😇": "1f607",
  "🙂": "1f642",
  "😉": "1f609",
  "😌": "1f60c",
  "😍": "1f60d",
  "🥰": "1f970",
  "😘": "1f618",
  "😗": "1f617",
  "😋": "1f60b",
  "😛": "1f61b",
  "😜": "1f61c",
  "🤪": "1f92a",
  "😎": "1f60e",
  "🥳": "1f973",
  "😏": "1f60f",
  "😒": "1f612",
  "😞": "1f61e",
  "🥺": "1f97a",
  "😢": "1f622",
  "😭": "1f62d",
  "😤": "1f624",
  "😡": "1f621",
  "🤬": "1f92c",
  "🤯": "1f92f",
  "😳": "1f633",
  "😱": "1f631",
  "😰": "1f630",
  "🤔": "1f914",
  "🤫": "1f92b",
  "🤐": "1f910",
  "😴": "1f634",
  "🤤": "1f924",
  "😵": "1f635",
  "👍": "1f44d",
  "👎": "1f44e",
  "👏": "1f44f",
  "🙌": "1f64c",
  "👐": "1f450",
  "🤝": "1f91d",
  "👊": "1f44a",
  "✊": "270a",
  "🤛": "1f91b",
  "🤜": "1f91c",
  "✌️": "270c-fe0f",
  "🤟": "1f91f",
  "🤘": "1f918",
  "👌": "1f44c",
  "🤏": "1f90f",
  "👈": "1f448",
  "👉": "1f449",
  "👆": "1f446",
  "👇": "1f447",
  "✋": "270b",
  "👋": "1f44b",
  "🤙": "1f919",
  "💪": "1f4aa",
  "🙏": "1f64f",
  "✍️": "270d-fe0f",
  "🤳": "1f933",
  "💅": "1f485",
  "❤️": "2764-fe0f",
  "🧡": "1f9e1",
  "💛": "1f49b",
  "💚": "1f49a",
  "💙": "1f499",
  "💜": "1f49c",
  "🖤": "1f5a4",
  "🤍": "1f90d",
  "🤎": "1f90e",
  "💔": "1f494",
  "❣️": "2763-fe0f",
  "💕": "1f495",
  "💞": "1f49e",
  "💓": "1f493",
  "💗": "1f497",
  "💖": "1f496",
  "💘": "1f498",
  "💝": "1f49d",
  "🔥": "1f525",
  "✨": "2728",
  "🌟": "1f31f",
  "⭐": "2b50",
  "💫": "1f4ab",
  "💥": "1f4a5",
  "💯": "1f4af",
  "💢": "1f4a2",
  "💬": "1f4ac",
  "💭": "1f4ad",
  "🎉": "1f389",
  "🎊": "1f38a",
  "🎈": "1f388",
  "🎁": "1f381",
  "🏆": "1f3c6",
  "🥇": "1f947",
  "🎯": "1f3af",
  "🚀": "1f680",
  "✈️": "2708-fe0f",
  "🚗": "1f697",
  "🔔": "1f514",
  "📢": "1f4e2",
  "🎵": "1f3b5",
  "🎶": "1f3b6",
  "💡": "1f4a1",
  "🔑": "1f511",
  "🔒": "1f512",
  "📱": "1f4f1",
  "💻": "1f4bb",
  "☕": "2615",
  "🍺": "1f37a",
  "🍕": "1f355",
  "🍔": "1f354",
  "🍰": "1f370",
  "🎂": "1f382",
  "🌸": "1f338",
  "🌹": "1f339",
  "🍀": "1f340"
}

export function getAppleEmojiUrl(emojiStr) {
  if (!emojiStr || typeof emojiStr !== 'string') return null
  const trimmed = emojiStr.trim()
  if (!trimmed) return null
  if (APPLE_EMOJI_MAP[trimmed]) {
    return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/64/${APPLE_EMOJI_MAP[trimmed]}.png`
  }
  try {
    const rawCodes = Array.from(trimmed).map((c) => c.codePointAt(0)?.toString(16).toLowerCase()).filter(Boolean)
    const clean = rawCodes.filter((c) => c !== 'fe0f').join('-')
    if (!clean) return null
    return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/64/${clean}.png`
  } catch {
    return null
  }
}

const EMOJI_MATCH_REGEX = /(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\p{Emoji_Modifier})?)+)/u
const EMOJI_TEST_REGEX = /\p{Extended_Pictographic}/u

export function renderWithAppleEmoji(text, keyPrefix = 'em') {
  if (!text || typeof text !== 'string') return text
  if (!EMOJI_TEST_REGEX.test(text)) return text

  const parts = text.split(EMOJI_MATCH_REGEX)
  if (parts.length <= 1) return text

  return parts.map((part, idx) => {
    if (!part) return null
    if (EMOJI_TEST_REGEX.test(part)) {
      const url = getAppleEmojiUrl(part)
      if (!url) return <React.Fragment key={`${keyPrefix}-${idx}`}>{part}</React.Fragment>
      return (
        <span key={`${keyPrefix}-${idx}`} className="tg-apple-emoji-wrap">
          <img
            src={url}
            alt={part}
            className="tg-apple-emoji-inline"
            draggable={false}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              const fallback = e.currentTarget.nextElementSibling
              if (fallback) fallback.style.display = 'inline'
            }}
          />
          <span className="tg-emoji-native-fallback" style={{ display: 'none' }}>
            {part}
          </span>
        </span>
      )
    }
    return <React.Fragment key={`${keyPrefix}-${idx}`}>{part}</React.Fragment>
  })
}
