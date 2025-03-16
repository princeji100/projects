import connectToDatabase from "@/lib/connectToDB";
import Event from "@/models/Event";
import Page from "@/models/Page";
import User from "@/models/User";
import { faDiscord, faFacebook, faGithub, faInstagram, faInternetExplorer, faLinkedin, faPinterest, faReddit, faSnapchat, faTelegram, faTwitter, faViber, faWhatsapp, faYoutube } from "@fortawesome/free-brands-svg-icons";
import { faMapMarkerAlt, faEnvelope, faMoblie, faLink, faPhone } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";

const iconMapping = {
    email: faEnvelope,
    mobile: faPhone,
    instagram: faInstagram,
    twitter: faTwitter,
    facebook: faFacebook,
    linkedin: faLinkedin,
    discord: faDiscord,
    youtube: faYoutube,
    whatsapp: faWhatsapp,
    telegram: faTelegram,
    viber: faViber,
    snapchat: faSnapchat,
    pinterest: faPinterest,
    reddit: faReddit,
    website: faInternetExplorer,
    github: faGithub,
};

const UserPage = async ({ params }) => {
    const { uri } = await params;
    await connectToDatabase();
    const page = await Page.findOne({ uri });
    const user = await User.findOne({ email: page?.owner });
    await Event.create({ url: uri, page: uri, type: 'view' });
    const buttonLink = (key, value) => {
        if (key === 'mobile') {
            return 'tel:' + value;
        }
        if (key === 'email') {
            return 'mailto:' + value; // Corrected typo here
        }
        return value; // Default case for other keys
    };

    return (
        <div className="bg-blue-950 text-white min-h-screen">
            <div className="h-36 bg-cover bg-center" style={
                page?.bgType === 'color' ? { backgroundColor: page?.bgColor } : { backgroundImage: `url(${page?.bgImage})` }
            }></div>
            <div className="bg-black shadow shadow-black/50 w-36 aspect-square mx-auto h-36 flex rounded-full relative -top-18 -mb-16">
                <Image className="rounded-full" src={user?.image} width={144} height={144} alt='avatar' />
            </div>
            <h2 className="text-2xl text-center mb-1">{page?.displayName}</h2>
            <h3 className="text-md flex gap-2 justify-center items-baseline text-white/70">
                <FontAwesomeIcon className="h-4" icon={faMapMarkerAlt} />
                <span>
                    {page?.location}
                </span>
            </h3>
            <div className="max-w-xs mx-auto text-center my-2">
                <p>{page?.bio}</p>
            </div>
            <div className="flex gap-2 justify-center mt-4 pb-4">
                {page?.buttons && Object.keys(page.buttons).map(buttonKey => {
                    return (
                        <Link key={buttonKey} className="rounded-full p-2 flex items-center gap-1 bg-white text-blue-950" href={buttonLink(buttonKey, page.buttons[buttonKey])}>
                            <FontAwesomeIcon className="h-5 w-5" icon={iconMapping[buttonKey]} />
                        </Link>
                    );
                })}
            </div>
            <div className="max-w-2l mx-auto grid md:grid-cols-2 p-4 gap-6 px-8">
                {page?.links.map(link => (
                    <Link key={Math.random()} target="_blank" ping={process.env.NEXT_PUBLIC_URL + 'api/click?url=' + btoa(link.url) + '&page=' + page.uri} className="bg-indigo-800 rounded-md flex p-2" href={link.url}>
                <div className="bg-blue-700 w-16 h-16 aspect-square relative -left-4 overflow-hidden flex items-center rounded-full justify-center">
                    {link.icon && (
                        <Image src={link.icon} alt='alt' width={64} height={64} />
                    )}
                    {!link.icon && (
                        <FontAwesomeIcon className="w-8 h-6" icon={faLink} />
                    )}
                </div>
                <div className="flex flex-col">
                    <h3>{link.title}</h3>
                    <p className="text-white/50 h-6 overflow-hidden">{link.subtitle}</p>
                </div>
            </Link>
                ))}
        </div>
        </div >
    );
};

export default UserPage;