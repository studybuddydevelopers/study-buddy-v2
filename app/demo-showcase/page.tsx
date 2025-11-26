import Logo from '@/components/Logo';
import BadgeDemo from '@/demo/BadgeDemo';
import ButtonsDemo from '@/demo/ButtonsDemo';
import CardsDemo from '@/demo/CardsDemo';
import ChatMessageContainerDemo from '@/demo/ChatMessageContainerDemo';
import ChatMessageDemo from '@/demo/ChatMessageDemo';
import FooterDemo from '@/demo/FooterDemo';
import HeadingsDemo from '@/demo/HeadingsDemo';
import ImageDemo from '@/demo/ImageDemo';
import LogoDemo from '@/demo/LogoDemo';
import MultiSelectFieldDemo from '@/demo/MultiSelectFieldDemo';
import NavBarDemo from '@/demo/NavBarDemo';
import OptionsDemo from '@/demo/OptionsDemo';
import ProgressBarDemo from '@/demo/ProgressBarDemo';
import SelectFieldDemo from '@/demo/SelectFieldDemo';
import TableDemo from '@/demo/TableDemo';
import TextFieldDemo from '@/demo/TextFieldDemo';
import TypographyDemo from '@/demo/TypographyDemo';

export default async function DemoShowCasePage() {
  await new Promise(r => setTimeout(r, 1000)); // simulate loading
  return (
    <>
      <Logo size="xs" animated animation='rotate'/>
      <Logo size="sm" animated animation='rotate'/>
      <Logo size="md" animated animation='rotate'/>
      <Logo size="lg" animated animation='rotate'/>
      <Logo size="xl" animated animation='rotate'/>
      <Logo size="2xl" animated animation='rotate'/>
      <Logo size="3xl" animated animation='rotate'/>
      <Logo size="4xl" animated animation='rotate'/>
      <Logo size="5xl" animated animation='rotate'/>
      <Logo size="6xl" animated animation='rotate'/>
      <Logo size="max" animated animation='rotate' variant='icon'/>

      <HeadingsDemo />
      <TypographyDemo />
      <ButtonsDemo />
      <CardsDemo />
      <OptionsDemo />
      <ChatMessageDemo />
      <ChatMessageContainerDemo />
      <ImageDemo />
      <LogoDemo />
      <ProgressBarDemo />
      <BadgeDemo />
      <TableDemo />
      <TextFieldDemo />
      <SelectFieldDemo />
      <MultiSelectFieldDemo />
      <FooterDemo />
      <NavBarDemo />
    </>
  );
}
