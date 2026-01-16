"use client";

import { useState } from "react";
import {
  RiAlertLine,
  RiCheckboxCircleLine,
  RiInformationLine,
  RiPlugLine,
  RiServerLine,
  RiShieldUserLine,
  RiTranslate2,
  RiWindowLine,
} from "react-icons/ri";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FloatingWindow } from "@/components/ui/floating-window";
import { useFloatingWindowStore } from "@/lib/stores/floating-window-store";
import { dashboardTranslations } from "./translations";

interface DashboardClientProps {
  language: "en" | "ja";
  userRole: string;
  userName: string;
}

export function DashboardClient({
  language,
  userRole,
  userName,
}: DashboardClientProps) {
  const t = dashboardTranslations[language];
  const [switchValue, setSwitchValue] = useState(false);
  const [checkboxValue, setCheckboxValue] = useState(false);
  const { open: openFloatingWindow, isOpen: isFloatingWindowOpen } =
    useFloatingWindowStore();

  const handleOpenFloatingWindow = () => {
    openFloatingWindow({
      title: t.floatingWindowTitle,
      titleJa: t.floatingWindowTitle,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t.floatingWindowContent}</p>
          <div className="flex flex-wrap gap-2">
            <Badge>Draggable</Badge>
            <Badge variant="secondary">Resizable</Badge>
            <Badge variant="outline">Minimizable</Badge>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Maximizable
            </Badge>
          </div>
        </div>
      ),
      initialPosition: { x: 200, y: 150 },
      initialSize: { width: 400, height: 250 },
    });
  };

  const features = [
    {
      icon: RiPlugLine,
      title: t.featureModular,
      description: t.featureModularDesc,
    },
    {
      icon: RiShieldUserLine,
      title: t.featureRoles,
      description: t.featureRolesDesc,
    },
    {
      icon: RiServerLine,
      title: t.featureLdap,
      description: t.featureLdapDesc,
    },
    {
      icon: RiTranslate2,
      title: t.featureI18n,
      description: t.featureI18nDesc,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-primary border-0">
        <CardContent className="py-6">
          <div className="flex items-center justify-between text-primary-foreground">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {t.welcomeBack}, {userName}!
              </h1>
              <p className="opacity-80">
                {t.roleLabel}: <span className="font-semibold">{userRole}</span>
              </p>
            </div>
            <div className="hidden md:block">
              <div className="text-right">
                <p className="opacity-70 text-sm">{t.today}</p>
                <p className="text-xl font-semibold">
                  {new Date().toLocaleDateString(
                    language === "ja" ? "ja-JP" : "en-US",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About This Application */}
      <Card>
        <CardHeader>
          <CardTitle>{t.messageTitle}</CardTitle>
          <CardDescription>{t.messageDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-3 p-4 rounded-lg bg-muted/50"
              >
                <div className="p-2 rounded-md bg-primary/10">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Component Demo Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t.componentDemoTitle}</CardTitle>
          <CardDescription>{t.componentDemoDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Buttons */}
          <div>
            <h4 className="font-medium mb-3">{t.demoButtons}</h4>
            <div className="flex flex-wrap gap-2">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>

          {/* Badges */}
          <div>
            <h4 className="font-medium mb-3">{t.demoBadges}</h4>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Success
              </Badge>
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                Warning
              </Badge>
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Info
              </Badge>
            </div>
          </div>

          {/* Alerts */}
          <div>
            <h4 className="font-medium mb-3">{t.demoAlerts}</h4>
            <div className="space-y-3">
              <Alert>
                <RiInformationLine className="h-4 w-4" />
                <AlertTitle>{t.alertInfoTitle}</AlertTitle>
                <AlertDescription>{t.alertInfoDesc}</AlertDescription>
              </Alert>
              <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                <RiAlertLine className="h-4 w-4" />
                <AlertTitle>{t.alertWarningTitle}</AlertTitle>
                <AlertDescription>{t.alertWarningDesc}</AlertDescription>
              </Alert>
              <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
                <RiCheckboxCircleLine className="h-4 w-4" />
                <AlertTitle>{t.alertSuccessTitle}</AlertTitle>
                <AlertDescription>{t.alertSuccessDesc}</AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Cards */}
          <div>
            <h4 className="font-medium mb-3">{t.demoCards}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t.cardTitle}</CardTitle>
                  <CardDescription>{t.cardDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t.cardContent}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base">Muted Card</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This card has a muted background for visual hierarchy.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Floating Window */}
          <div>
            <h4 className="font-medium mb-3">{t.demoFloatingWindow}</h4>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleOpenFloatingWindow}
                disabled={isFloatingWindowOpen}
              >
                <RiWindowLine className="w-4 h-4 mr-2" />
                {t.floatingWindowButton}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t.floatingWindowNote}
              </span>
            </div>
          </div>

          {/* Form Inputs */}
          <div>
            <h4 className="font-medium mb-3">{t.demoInputs}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="demo-input">Input</Label>
                  <Input id="demo-input" placeholder="Type something..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-select">Select</Label>
                  <Select>
                    <SelectTrigger id="demo-select">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                      <SelectItem value="option2">Option 2</SelectItem>
                      <SelectItem value="option3">Option 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="demo-switch"
                    checked={switchValue}
                    onCheckedChange={setSwitchValue}
                  />
                  <Label htmlFor="demo-switch">
                    Switch ({switchValue ? "ON" : "OFF"})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="demo-checkbox"
                    checked={checkboxValue}
                    onCheckedChange={(checked) =>
                      setCheckboxValue(checked === true)
                    }
                  />
                  <Label htmlFor="demo-checkbox">
                    Checkbox ({checkboxValue ? "Checked" : "Unchecked"})
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floating Window Component */}
      <FloatingWindow language={language} />
    </div>
  );
}
