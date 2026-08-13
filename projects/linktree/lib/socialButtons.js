import {
  faDiscord,
  faFacebook,
  faGithub,
  faInstagram,
  faLinkedin,
  faPinterest,
  faReddit,
  faSnapchat,
  faTelegram,
  faTwitter,
  faViber,
  faWhatsapp,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';
import {
  faEnvelope,
  faMobile,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons';

export const allButtons = [
  {
    key: 'email',
    label: 'e-mail',
    icon: faEnvelope,
    placeholder: 'test@gmail.com',
    color: '#ea4335',
  },
  {
    key: 'mobile',
    label: 'mobile',
    icon: faMobile,
    placeholder: '+91 91526 54562',
    color: '#10b981',
  },
  {
    key: 'instagram',
    label: 'instagram',
    icon: faInstagram,
    placeholder: '@yourusername',
    color: '#e1306c',
  },
  {
    key: 'twitter',
    label: 'twitter',
    icon: faTwitter,
    placeholder: '@yourusername',
    color: '#1da1f2',
  },
  {
    key: 'facebook',
    label: 'facebook',
    icon: faFacebook,
    placeholder: 'facebook.com/yourprofile',
    color: '#1877f2',
  },
  {
    key: 'linkedin',
    label: 'linkedin',
    icon: faLinkedin,
    placeholder: 'linkedin.com/in/yourprofile',
    color: '#0a66c2',
  },
  {
    key: 'discord',
    label: 'discord',
    icon: faDiscord,
    placeholder: 'username#1234',
    color: '#5865f2',
  },
  {
    key: 'youtube',
    label: 'youtube',
    icon: faYoutube,
    placeholder: 'youtube.com/c/yourchannel',
    color: '#ff0000',
  },
  {
    key: 'whatsapp',
    label: 'whatsapp',
    icon: faWhatsapp,
    placeholder: '+1234567890',
    color: '#25d366',
  },
  {
    key: 'telegram',
    label: 'telegram',
    icon: faTelegram,
    placeholder: '@yourusername',
    color: '#229ed9',
  },
  {
    key: 'viber',
    label: 'viber',
    icon: faViber,
    placeholder: '+1234567890',
    color: '#7360f2',
  },
  {
    key: 'snapchat',
    label: 'snapchat',
    icon: faSnapchat,
    placeholder: '@yourusername',
    color: '#eab308',
  },
  {
    key: 'pinterest',
    label: 'pinterest',
    icon: faPinterest,
    placeholder: 'pinterest.com/yourprofile',
    color: '#e60023',
  },
  {
    key: 'reddit',
    label: 'reddit',
    icon: faReddit,
    placeholder: 'reddit.com/user/yourusername',
    color: '#ff4500',
  },
  {
    key: 'website',
    label: 'website',
    icon: faGlobe,
    placeholder: 'https://yourwebsite.com',
    color: '#3b82f6',
  },
  {
    key: 'github',
    label: 'github',
    icon: faGithub,
    placeholder: 'github.com/yourusername',
    color: '#24292e',
  },
];

const buttonMap = new Map(allButtons.map((b) => [b.key, b]));

export function getSocialButton(key) {
  if (buttonMap.has(key)) {
    return buttonMap.get(key);
  }
  return {
    key,
    label: key,
    icon: faGlobe,
    placeholder: `https://${key}.com/profile`,
    color: '#64748b', // Neutral slate fallback
  };
}
