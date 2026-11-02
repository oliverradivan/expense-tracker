import './Skeleton.css'

export default function Skeleton({ className = '', style }) {
  return <span aria-hidden="true" className={`skeleton-block ${className}`} style={style} />
}
