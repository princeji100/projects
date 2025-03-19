import connectToDatabase from "@/lib/connectToDB";
import Event from "@/models/Event";
import Page from "@/models/Page";
import User from "@/models/User";
import { faDiscord, faFacebook, faGithub, faInstagram, faLinkedin, faPinterest, faReddit, faSnapchat, faTelegram, faTwitter, faViber, faWhatsapp, faYoutube } from "@fortawesome/free-brands-svg-icons";
import { faMapMarkerAlt, faEnvelope, faPhone, faLink, faGlobe } from "@fortawesome/free-solid-svg-icons";
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
    website: faGlobe,
    github: faGithub,
};

const UserPage = async ({ params }) => {
    const { uri } = params;
    await connectToDatabase();
    const page = await Page.findOne({ uri });
    const user = await User.findOne({ email: page?.owner });
    await Event.create({ url: uri, page: uri, type: 'view' });

    const buttonLink = (key, value) => {
        switch (key) {
            case 'mobile': return `tel:${value}`;
            case 'email': return `mailto:${value}`;
            case 'whatsapp': return `https://wa.me/${value.replace(/\D/g, '')}`;
            default: return value;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-950 to-indigo-900 text-white pb-12">
            {/* Header Section */}
            <div 
                className="h-56 bg-cover bg-center transition-all duration-300 relative before:absolute before:inset-0 before:bg-black/20" 
                style={
                    page?.bgType === 'color' 
                    ? { backgroundColor: page?.bgColor } 
                    : { backgroundImage: `url(${page?.bgImage})` }
                }
            />

            {/* Profile Section */}
            <div className="max-w-4xl mx-auto px-4 -mt-28 relative z-10">
                <div className="flex flex-col items-center">
                    {/* Profile Image */}
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-1 rounded-full shadow-2xl shadow-black/30">
                        <div className="w-44 h-44 rounded-full overflow-hidden ring-4 ring-white/10">
                            <Image 
                                className="object-cover w-full h-full" 
                                src={user?.image} 
                                width={176} 
                                height={176} 
                                alt={page?.displayName || 'Profile picture'}
                                priority
                            />
                        </div>
                    </div>
                    
                    {/* Profile Info */}
                    <h2 className="text-4xl font-bold text-center mt-6 mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                        {page?.displayName}
                    </h2>
                    
                    {page?.location && (
                        <h3 className="text-lg flex gap-2 justify-center items-center text-blue-200/80 mb-4">
                            <FontAwesomeIcon className="h-4" icon={faMapMarkerAlt} />
                            <span>{page.location}</span>
                        </h3>
                    )}
                    
                    {page?.bio && (
                        <div className="max-w-md mx-auto text-center mb-10">
                            <p className="text-blue-100/90 leading-relaxed">{page.bio}</p>
                        </div>
                    )}

                    {/* Social Buttons */}
                    {page?.buttons && Object.keys(page.buttons).length > 0 && (
                        <div className="flex flex-wrap gap-4 justify-center mt-4 mb-10">
                            {Object.keys(page.buttons).map(buttonKey => (
                                <Link 
                                    key={buttonKey} 
                                    href={buttonLink(buttonKey, page.buttons[buttonKey])}
                                    className="rounded-full p-4 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm 
                                             shadow-lg hover:shadow-xl transition-all duration-300 w-14 h-14 hover:-translate-y-1"
                                >
                                    <FontAwesomeIcon 
                                        className="h-6 w-6" 
                                        icon={iconMapping[buttonKey]} 
                                    />
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Links Grid */}
                    <div className="grid md:grid-cols-2 gap-4 w-full max-w-3xl mx-auto">
                        {page?.links?.map(link => (
                            <Link 
                                key={link.url} 
                                href={link.url}
                                target="_blank"
                                ping={`${process.env.NEXT_PUBLIC_URL}api/click?url=${btoa(link.url)}&page=${page.uri}`}
                                className="group relative bg-white/10 hover:bg-white/20 rounded-xl flex items-center p-5 gap-5 
                                         transition-all duration-300 backdrop-blur-sm hover:-translate-y-1 hover:shadow-xl"
                            >
                                <div className="bg-gradient-to-br from-blue-500/50 to-indigo-600/50 w-16 h-16 rounded-full 
                                              flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-white/10">
                                    {link.icon ? (
                                        <Image 
                                            src={link.icon} 
                                            alt={link.title} 
                                            width={64} 
                                            height={64}
                                            className="object-cover w-full h-full"
                                        />
                                    ) : (
                                        <FontAwesomeIcon 
                                            className="w-6 h-6 text-white/90" 
                                            icon={faLink} 
                                        />
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <h3 className="font-semibold text-lg truncate text-white">
                                        {link.title || 'Untitled Link'}
                                    </h3>
                                    {link.subtitle && (
                                        <p className="text-blue-200/70 text-sm truncate">
                                            {link.subtitle}
                                        </p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserPage;