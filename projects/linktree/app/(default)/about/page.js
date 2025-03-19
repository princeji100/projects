import Image from "next/image"
import Link from "next/link"

const AboutPage = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-4xl mx-auto">
                <div className="text-center py-12">
                    <h1 className="text-4xl font-bold text-slate-800 mb-8">About Me</h1>
                    <div className="relative w-32 h-32 mx-auto mb-8">
                        <Image
                            src={'/prince.jpg'}
                            fill
                            alt="Prince"
                            className="rounded-full object-top object-cover shadow-md border-4 border-white"
                            priority
                        />
                    </div>
                </div>

                <div className="bg-white shadow-sm rounded-xl p-8 mb-8">
                    <div className="prose max-w-none">
                        <h2 className="text-2xl font-semibold mb-4 text-slate-800">Hello, I'm Prince</h2>
                        <p className="text-slate-600 leading-relaxed mb-8">
                            I'm a fresh graduate and aspiring developer with a passion for creating 
                            modern web experiences. I specialize in building responsive and user-friendly 
                            web applications using cutting-edge technologies, constantly expanding my 
                            knowledge to stay at the forefront of web development.
                        </p>

                        <h3 className="text-xl font-semibold mb-4 text-slate-700">Technical Skills</h3>
                        <div className="flex flex-wrap gap-2 mb-8">
                            <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">Next.js</span>
                            <span className="px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-sm font-medium">React</span>
                            <span className="px-4 py-1.5 bg-amber-50 text-amber-600 rounded-full text-sm font-medium">JavaScript</span>
                            <span className="px-4 py-1.5 bg-purple-50 text-purple-600 rounded-full text-sm font-medium">Tailwind CSS</span>
                            <span className="px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-sm font-medium">HTML</span>
                            <span className="px-4 py-1.5 bg-teal-50 text-teal-600 rounded-full text-sm font-medium">MongoDB</span>
                        </div>

                        <h3 className="text-xl font-semibold mb-4 text-slate-700">Recent Projects</h3>
                        <ul className="space-y-3 mb-8 text-slate-600">
                            <li className="flex items-center space-x-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                <span className="hover:text-blue-600 transition duration-200">LinkTree Clone - A Next.js web application</span>
                            </li>
                            <li className="flex items-center space-x-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                <span className="hover:text-blue-600 transition duration-200">Portfolio Website - Personal portfolio using React</span>
                            </li>
                        </ul>

                        <h3 className="text-xl font-semibold mb-4 text-slate-700">Get in Touch</h3>
                        <p className="text-slate-600">
                            I'm always open to new opportunities and collaborations. Feel free to reach out at{' '}
                            <Link 
                                href="mailto:Princesrivastav216@gmail.com" 
                                className="text-blue-600 hover:text-blue-800 transition duration-200 font-medium"
                            >
                                Princesrivastav216@gmail.com
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AboutPage