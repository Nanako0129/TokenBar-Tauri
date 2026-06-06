import { Composition } from 'remotion'
import { TokenBarLandingMotion } from './TokenBarLandingMotion'

export const RemotionRoot = () => {
  return (
    <Composition
      id="TokenBarLandingMotion"
      component={TokenBarLandingMotion}
      durationInFrames={210}
      fps={30}
      width={1440}
      height={900}
    />
  )
}
