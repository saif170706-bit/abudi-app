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
import { useLanguage } from "@/context/LanguageContext";
import { useGlobalTranslation } from "@/hooks/useGlobalTranslation";

const LOGO_URL = "https://i.postimg.cc/RVPTkLJN/frontepagelogo-5282001fe8581541590a.png";

export default function TermsPage() {
  const [date, setDate] = useState("");
  const { language } = useLanguage();
  const { tGlobal } = useGlobalTranslation();

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
            {tGlobal('Brugervilkår')}
          </CardTitle>
          <CardDescription className="text-[15px] font-medium mt-1">
            {tGlobal('Sidst opdateret')}: {date || "24-08-2025"}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 sm:px-10">
          <div className="rounded-[32px] bg-muted border border-border overflow-hidden">
            <ScrollArea className="h-[450px] w-full p-6 sm:p-8 text-left">
              <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
                <section>
                  <p>{tGlobal('TOS_Intro')}</p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-foreground uppercase">{tGlobal('TOS_Changes_Title')}</h3>
                  <p>{tGlobal('TOS_Changes_Desc')}</p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-foreground uppercase">{tGlobal('TOS_Who_Title')}</h3>
                  <p>{tGlobal('TOS_Who_Desc')}</p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-foreground uppercase">{tGlobal('TOS_Privacy_Title')}</h3>
                  <p>{tGlobal('TOS_Privacy_Desc')}</p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-foreground uppercase">{tGlobal('TOS_Commit_Title')}</h3>
                  <ol className="list-decimal pl-5 space-y-4">
                    <li>{tGlobal('TOS_Commit_Point_1')}</li>
                    <li>{tGlobal('TOS_Commit_Point_2')}</li>
                    <li>{tGlobal('TOS_Commit_Point_3')}</li>
                    <li>{tGlobal('TOS_Commit_Point_4')}</li>
                    <li>{tGlobal('TOS_Commit_Point_5')}</li>
                  </ol>
                </section>
                
                <section>
                  <p className="text-xs opacity-50">ibnamertechnical@gmail.com</p>
                </section>
              </div>
            </ScrollArea>
          </div>
        </CardContent>

        <CardFooter className="px-6 sm:px-10 pb-12 pt-8">
          <Link href="/" className="w-full">
            <Button className="w-full h-16 rounded-[26px] text-lg font-bold bg-[#111214] hover:bg-black text-white shadow-lg active:scale-[0.98] transition-all">
              <ArrowLeft className="mr-2 h-5 w-5 opacity-40" />
              {tGlobal('Tilbage til login')}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
