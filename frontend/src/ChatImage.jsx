import React, { useState, useEffect } from 'react'
import { isImageDecoded, registerDecodedImage, preloadImage } from './chatMediaDb.js'

export function ChatImage({ src, alt = 'Hình ảnh', className = 'tg-msg-image', style, onClick }) {
  const isAlreadyLoaded = isImageDecoded(src)
  const [isLoaded, setIsLoaded] = useState(isAlreadyLoaded)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    if (!src) return
    if (isImageDecoded(src)) {
      setIsLoaded(true)
      return
    }

    let isMounted = true
    const img = new Image()
    img.src = src

    const handleReady = () => {
      registerDecodedImage(src)
      if (isMounted) {
        setIsLoaded(true)
      }
    }

    if (img.complete && img.naturalWidth > 0) {
      handleReady()
    } else {
      img.onload = handleReady
      img.onerror = () => {
        if (isMounted) setIsError(true)
      }
    }

    return () => {
      isMounted = false
    }
  }, [src])

  if (isError) {
    return (
      <div className="tg-msg-image-wrap tg-msg-image-skeleton" style={{ borderStyle: 'solid', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
        <span className="tg-skeleton-icon">⚠️</span>
        <span>Không thể tải hình ảnh</span>
      </div>
    )
  }

  return (
    <div className="tg-msg-image-wrap" style={{ position: 'relative', overflow: 'hidden', borderRadius: 14 }}>
      {/* If not loaded yet on initial download, display lightweight skeleton */}
      {!isLoaded && (
        <div
          className="tg-msg-image-skeleton"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            margin: 0,
            minHeight: 140,
            width: '100%',
          }}
        >
          <span className="tg-skeleton-icon">🖼️</span>
          <span>Đang tải...</span>
        </div>
      )}

      <img
        src={src}
        alt={alt}
        className={className}
        decoding={isAlreadyLoaded ? 'sync' : 'async'}
        style={{
          ...style,
          opacity: isLoaded ? 1 : 0,
          transition: isAlreadyLoaded ? 'none' : 'opacity 0.15s ease-out',
          display: 'block',
        }}
        onLoad={() => {
          registerDecodedImage(src)
          setIsLoaded(true)
        }}
        onError={() => setIsError(true)}
        onClick={onClick}
      />
    </div>
  )
}

export default ChatImage
