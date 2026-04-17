'use client';

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

const LOGO_URL = "https://i.postimg.cc/RVPTkLJN/frontepagelogo-5282001fe8581541590a.png";

export default function PrivacyPage() {
  const [date, setDate] = useState("");

  useEffect(() => {
    setDate("24-08-2025");
  }, []);

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 sm:p-8">
      <Card className="mx-auto max-w-[640px] w-full border-none shadow-[0_25px_70px_rgba(0,0,0,0.07)] rounded-[48px] overflow-hidden bg-card">
        <CardHeader className="text-center pt-12 pb-6 px-6 sm:px-10">
          <div className="relative h-20 w-20 mx-auto mb-4 rounded-[26px] overflow-hidden shadow-lg border-4 border-white">
            <Image 
              src={LOGO_URL} 
              alt="Ibn Amer Logo" 
              fill 
              className="object-cover" 
              priority
            />
          </div>
          <CardTitle className="text-[34px] leading-tight font-extrabold font-headline tracking-tight text-foreground">
            Privacy Policy
          </CardTitle>
          <CardDescription className="text-[15px] font-medium mt-1">
            Last updated: {date || "24-08-2025"}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 sm:px-10">
          <div className="rounded-[32px] bg-muted border border-border overflow-hidden">
            <ScrollArea className="h-[450px] w-full p-6 sm:p-8 text-left">
              <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
                <section>
                  <p>
                    We (“Ibn Amer hifd”) recognise that your privacy is very important and take it seriously. This Privacy Policy sets out how we collect, use and disclose your data when you use our website <a href="https://ibnamer.dk/" className="text-primary font-bold">https://ibnamer.dk/</a> and our Platform.
                  </p>
                  <p>
                    By using this Platform, you agree to the terms and conditions of this Privacy Policy. You also consent to our use and disclosure of your Personal Information in the manner described herein. If you do not agree with these terms, please do not use this platform.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-foreground">INFORMATION WE COLLECT AND HOW WE USE IT</h3>
                  <p>We collect the following information to provide and improve our services:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Log-in Data:</strong> User ID, name, mobile phone number, password, email and gender. Used to facilitate account setup, communication, user support, and personalization.</li>
                    <li><strong>Log Data:</strong> Information automatically collected through cookies or browser local storage. Used for data analysis, troubleshooting, security, and usage patterns.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-foreground">DISCLOSURE OF YOUR INFORMATION</h3>
                  <p>We disclose your information in the following manner:</p>
                  <ul className="list-disc pl-5 space-y-4">
                    <li><strong>Group Companies:</strong> We may share data with members of our organizational group.</li>
                    <li><strong>Shared Content:</strong> When you share content on the Platform, you choose the audience. We do not control how external persons use information shared with them.</li>
                    <li><strong>Third Parties:</strong> We may share data with affiliates, advertising networks (aggregated non-identifiable data), and law enforcement if required by legal obligation or to protect safety.</li>
                    <li><strong>Business Transfers:</strong> In case of merger or acquisition, your data may be transferred, subject to notification and opt-out rights.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-foreground">SECURITY PRACTICES</h3>
                  <p>We have in place appropriate technical and security measures to secure the information collected by us. You are responsible for keeping your login credentials confidential.</p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-foreground">WHERE WE STORE YOUR PERSONAL INFORMATION</h3>
                  <p>We store your data securely on the <strong>Firebase cloud platform</strong>.</p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-foreground">YOUR RIGHTS</h3>
                  <p>You may ask the administrator to remove or delete content from your profile at any time. You have the right to review, correct, and amend your information by visiting your profile page or contacting us at <strong>ibnamertechnical@gmail.com</strong>. We require up to 60 days to comply with such requests.</p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-foreground">DATA RETENTION</h3>
                  <p>We do not retain Sensitive Personal Information (like passwords) longer than lawfully required. History of public activities and archived pages may remain in our systems indefinitely due to the nature of the internet.</p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-foreground">THIRD-PARTY EMBEDS & LINKS</h3>
                  <p>The Platform may contain links to or embeds from third-party sites (YouTube, Google, etc.). These are not covered by this policy, and we encourage you to review their specific privacy practices.</p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-foreground">GRIEVANCE</h3>
                  <p>If you have concerns regarding data safety or privacy, please contact our Grievance Officer:</p>
                  <p>Email: <strong>ibnamertechnical@gmail.com</strong></p>
                </section>
              </div>
            </ScrollArea>
          </div>
        </CardContent>

        <CardFooter className="px-6 sm:px-10 pb-12 pt-8">
          <Link href="/" className="w-full">
            <Button className="w-full h-16 rounded-[26px] text-lg font-bold bg-[#111214] hover:bg-black text-white shadow-lg active:scale-[0.98] transition-all">
              <ArrowLeft className="mr-2 h-5 w-5 opacity-40" />
              Tilbage til login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
