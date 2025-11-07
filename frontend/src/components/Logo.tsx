export default function Logo({ size = 200, maxHeight }: { size?: number; maxHeight?: number }) {
    const imgStyle: React.CSSProperties = {
      objectFit: 'contain',
      borderRadius: '8px',
      display: 'block',
      height: maxHeight ? `${maxHeight}px` : `${size}px`,
      width: maxHeight ? 'auto' : `${size}px`
    }
    return (
      <img 
        src="/kriscon.png" 
        alt="Kriscon Logo" 
        style={imgStyle}
      />
    )
  }
  
  