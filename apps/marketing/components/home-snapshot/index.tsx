/* Full original homepage DOM tree: React components, never runtime HTML parsing.
 * Modules may be connected to Master one by one without restructuring the page.
 */
import HeroSection from './hero';
import type {HomeContent} from '@/lib/home-cms';
import type {BlogPost} from '@/lib/blog';
import AnimatedHeadingSection from './animated';
import BuilderSection from './builder';
import RadarSection from './radar';
import ChannelsSection from './channels';
import ShowcaseSection from './showcase';
import ReferencesSection from './references';
import BottomCtaSection from './bottomCta';
import BlogSection from './blog';
import FaqSection from './faq';
import HeaderSnapshot from './header';
import FooterSnapshot from './footer';
export default function HomeSnapshot({home,posts=[],locale='tr'}:{home?:HomeContent|null;posts?:BlogPost[];locale?:string}){return <>
  {"\n"}
  <HeaderSnapshot />
  {"\n"}
  <div className={"tc-wide-container tc-home-main"}>
    {"\n"}
    <div className={"tc-row-wrap"}>
      {"\n"}
      <div className={"tc-row"}>
        {"\n"}
        <div className={"span12 widget-span widget-type-cell"} data-w={"12"} data-widget-type={"cell"} data-x={"0"}>
          {"\n"}
          <div className={"tc-row-wrap row-depth-1 row-number-1 dnd-section"}>
            {"\n"}
            <div className={"tc-row"}>
              {"\n"}
              <div className={"span12 widget-span widget-type-cell dnd-column"} data-w={"12"} data-widget-type={"cell"} data-x={"0"}>
                {"\n"}
                <div className={"tc-row-wrap row-depth-1 row-number-2 dnd-row"}>
                  {"\n"}
                  <div className={"tc-row"}>
                    {"\n"}
                    <div className={"span12 widget-span widget-type-custom_widget dnd-module"} data-w={"12"} data-widget-type={"custom_widget"} data-x={"0"}>
                      {"\n"}
                      <div className={"tc-component tc-component__content tc-component--section"} id={"tc-widget-033"}>
                        {"\n"}
                        <HeroSection home={home} locale={locale}/>
                        {"\n\n"}
                      </div>
                      {"\n"}
                    </div>
                    {"\n"}
                    {"\n"}
                  </div>
                  {"\n"}
                  {"\n"}
                </div>
                {"\n"}
                {"\n"}
              </div>
              {"\n"}
              {"\n"}
            </div>
            {"\n"}
            {"\n"}
          </div>
          {"\n"}
          {"\n"}
          <div className={"tc-row-wrap row-depth-1 row-number-3 dnd-section"}>
            {"\n"}
            <div className={"tc-row"}>
              {"\n"}
              <div className={"span12 widget-span widget-type-cell dnd-column"} data-w={"12"} data-widget-type={"cell"} data-x={"0"}>
                {"\n"}
                <div className={"tc-row-wrap row-depth-1 row-number-5 dnd-row"}>
                  {"\n"}
                  <div className={"tc-row"}>
                    {"\n"}
                    <div className={"span12 widget-span widget-type-custom_widget widget_1787731325402-hidden dnd-module"} data-w={"12"} data-widget-type={"custom_widget"} data-x={"0"}>
                      {"\n"}
                      <div className={"tc-component tc-component__content tc-component--section"} id={"tc-widget-038"}>
                        {"\n\n"}
                      </div>
                      {"\n"}
                    </div>
                    {"\n"}
                    {"\n"}
                  </div>
                  {"\n"}
                  {"\n"}
                </div>
                {"\n"}
                {"\n"}
              </div>
              {"\n"}
              {"\n"}
            </div>
            {"\n"}
            {"\n"}
          </div>
          {"\n"}
          {"\n"}
          <div className={"tc-row-wrap row-depth-1 row-number-6 dnd-section"}>
            {"\n"}
            <div className={"tc-row"}>
              {"\n"}
              <div className={"span12 widget-span widget-type-cell dnd-column"} data-w={"12"} data-widget-type={"cell"} data-x={"0"}>
                {"\n"}
                <div className={"tc-row-wrap row-depth-1 row-number-7 dnd-row"}>
                  {"\n"}
                  <div className={"tc-row"}>
                    {"\n"}
                    <div className={"span12 widget-span widget-type-custom_widget dnd-module"} data-w={"12"} data-widget-type={"custom_widget"} data-x={"0"}>
                      {"\n"}
                      <div className={"tc-component tc-component__content tc-component--section"} id={"tc-widget-037"}>
                        {"\n"}
                        <AnimatedHeadingSection />
                        {"\n\n"}
                      </div>
                      {"\n"}
                    </div>
                    {"\n"}
                    {"\n"}
                  </div>
                  {"\n"}
                  {"\n"}
                </div>
                {"\n"}
                {"\n"}
              </div>
              {"\n"}
              {"\n"}
            </div>
            {"\n"}
            {"\n"}
          </div>
          {"\n"}
          {"\n"}
          <div className={"tc-row-wrap row-depth-1 row-number-8 dnd-section"}>
            {"\n"}
            <div className={"tc-row"}>
              {"\n"}
              <div className={"span12 widget-span widget-type-cell dnd-column"} data-w={"12"} data-widget-type={"cell"} data-x={"0"}>
                {"\n"}
                <div className={"tc-row-wrap row-depth-1 row-number-9 dnd-row"}>
                  {"\n"}
                  <div className={"tc-row"}>
                    {"\n"}
                    <div className={"span12 widget-span widget-type-custom_widget dnd-module"} data-w={"12"} data-widget-type={"custom_widget"} data-x={"0"}>
                      {"\n"}
                      <div className={"tc-component tc-component__content tc-component--section"} id={"tc-widget-032"}>
                        {"\n"}
                        <BuilderSection />
                        {"\n\n"}
                      </div>
                      {"\n"}
                    </div>
                    {"\n"}
                    {"\n"}
                  </div>
                  {"\n"}
                  {"\n"}
                </div>
                {"\n"}
                {"\n"}
              </div>
              {"\n"}
              {"\n"}
            </div>
            {"\n"}
            {"\n"}
          </div>
          {"\n"}
          {"\n"}
          <div className={"tc-row-wrap row-depth-1 row-number-10 dnd-section"}>
            {"\n"}
            <div className={"tc-row"}>
              {"\n"}
              <div className={"span12 widget-span widget-type-cell dnd-column"} data-w={"12"} data-widget-type={"cell"} data-x={"0"}>
                {"\n"}
                <div className={"tc-row-wrap row-depth-1 row-number-11 dnd-row"}>
                  {"\n"}
                  <div className={"tc-row"}>
                    {"\n"}
                    <div className={"span12 widget-span widget-type-custom_widget dnd-module"} data-w={"12"} data-widget-type={"custom_widget"} data-x={"0"}>
                      {"\n"}
                      <div className={"tc-component tc-component__content tc-component--section"} id={"tc-widget-035"}>
                        {"\n"}
                        <RadarSection />
                        {"\n"}
                      </div>
                      {"\n"}
                    </div>
                    {"\n"}
                    {"\n"}
                  </div>
                  {"\n"}
                  {"\n"}
                </div>
                {"\n"}
                {"\n"}
              </div>
              {"\n"}
              {"\n"}
            </div>
            {"\n"}
            {"\n"}
          </div>
          {"\n"}
          {"\n"}
          <div className={"tc-row-wrap row-depth-1 row-number-12 dnd-section"}>
            {"\n"}
            <div className={"tc-row"}>
              {"\n"}
              <div className={"span12 widget-span widget-type-cell dnd-column"} data-w={"12"} data-widget-type={"cell"} data-x={"0"}>
                {"\n"}
                <div className={"tc-row-wrap row-depth-1 row-number-13 dnd-row"}>
                  {"\n"}
                  <div className={"tc-row"}>
                    {"\n"}
                    <div className={"span12 widget-span widget-type-custom_widget dnd-module"} data-w={"12"} data-widget-type={"custom_widget"} data-x={"0"}>
                      {"\n"}
                      <div className={"tc-component tc-component__content tc-component--section"} id={"tc-widget-034"}>
                        {"\n"}
                        <ChannelsSection />
                        {"\n\n"}
                      </div>
                      {"\n"}
                    </div>
                    {"\n"}
                    {"\n"}
                  </div>
                  {"\n"}
                  {"\n"}
                </div>
                {"\n"}
                {"\n"}
              </div>
              {"\n"}
              {"\n"}
            </div>
            {"\n"}
            {"\n"}
          </div>
          {"\n"}
          {"\n"}
          <div className={"tc-row-wrap row-depth-1 row-number-14 dnd-section"}>
            {"\n"}
            <div className={"tc-row"}>
              {"\n"}
              <div className={"span12 widget-span widget-type-cell dnd-column"} data-w={"12"} data-widget-type={"cell"} data-x={"0"}>
                {"\n"}
                <div className={"tc-row-wrap row-depth-1 row-number-15 dnd-row"}>
                  {"\n"}
                  <div className={"tc-row"}>
                    {"\n"}
                    <div className={"span12 widget-span widget-type-custom_widget dnd-module"} data-w={"12"} data-widget-type={"custom_widget"} data-x={"0"}>
                      {"\n"}
                      <div className={"tc-component tc-component__content tc-component--section"} id={"tc-widget-036"}>
                        {"\n"}
                        <ShowcaseSection />
                        {"\n\n"}
                      </div>
                      {"\n"}
                    </div>
                    {"\n"}
                    {"\n"}
                  </div>
                  {"\n"}
                  {"\n"}
                </div>
                {"\n"}
                {"\n"}
              </div>
              {"\n"}
              {"\n"}
            </div>
            {"\n"}
            {"\n"}
          </div>
          {"\n"}
          {"\n"}
          <div className={"tc-row-wrap row-depth-1 row-number-16 dnd-section"}>
            {"\n"}
            <div className={"tc-row"}>
              {"\n"}
              <div className={"span12 widget-span widget-type-custom_widget dnd-module"} data-w={"12"} data-widget-type={"custom_widget"} data-x={"0"}>
                {"\n"}
                <div className={"tc-component tc-component__content tc-component--section"} id={"tc-widget-030"}>
                  {"\n"}
                  <ReferencesSection home={home} locale={locale}/>
                  {"\n\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
              {"\n"}
            </div>
            {"\n"}
            {"\n"}
          </div>
          {"\n"}
          {"\n"}
          <div className={"tc-row-wrap row-depth-1 row-number-17 dnd-section"}>
            {"\n"}
            <div className={"tc-row"}>
              {"\n"}
              <div className={"span12 widget-span widget-type-cell dnd-column"} data-w={"12"} data-widget-type={"cell"} data-x={"0"}>
                {"\n"}
                <div className={"tc-row-wrap row-depth-1 row-number-18 dnd-row"}>
                  {"\n"}
                  <div className={"tc-row"}>
                    {"\n"}
                    <div className={"span12 widget-span widget-type-custom_widget dnd-module"} data-w={"12"} data-widget-type={"custom_widget"} data-x={"0"}>
                      {"\n"}
                      <div className={"tc-component tc-component__content tc-component--section"} id={"tc-widget-031"}>
                        {"\n"}
                        <BottomCtaSection />
                        {"\n"}
                      </div>
                      {"\n"}
                    </div>
                    {"\n"}
                    {"\n"}
                  </div>
                  {"\n"}
                  {"\n"}
                </div>
                {"\n"}
                {"\n"}
              </div>
              {"\n"}
              {"\n"}
            </div>
            {"\n"}
            {"\n"}
          </div>
          {"\n"}
          {"\n"}
        </div>
        {"\n"}
        {"\n"}
      </div>
      {"\n"}
    </div>
    {"\n"}
  </div>
  {"\n"}
  <div aria-modal={"true"} className={"tc-site-hero tc-ui-fs"} role={"dialog"}>
    {"\n"}
    <div className={"tc-ui-fs__stage"}>

    </div>
    {"\n"}
    <button aria-label={"Perfil anterior"} className={"tc-ui-fs__arrow tc-ui-fs__arrow--prev"} type={"button"}>
      {"\n"}
      <svg aria-hidden={true} fill={"none"} height={20} viewBox={"0 0 24 24"} width={20}>
        {"\n"}
        <path d={"M15 6l-6 6 6 6"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.6"}>

        </path>
        {"\n"}
      </svg>
      {"\n"}
    </button>
    {"\n"}
    <button aria-label={"Perfil siguiente"} className={"tc-ui-fs__arrow tc-ui-fs__arrow--next"} type={"button"}>
      {"\n"}
      <svg aria-hidden={true} fill={"none"} height={20} viewBox={"0 0 24 24"} width={20}>
        {"\n"}
        <path d={"M9 6l6 6-6 6"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.6"}>

        </path>
        {"\n"}
      </svg>
      {"\n"}
    </button>
    {"\n"}
  </div>
  {"\n"}
  {"\n"}
  <BlogSection home={home} locale={locale} posts={posts}/>
  {"\n"}
  {"\n"}
  <FaqSection home={home} locale={locale}/>
  {"\n"}
  <FooterSnapshot />
  {"\n\n\n\n\n\n\n\n\n\n\n\n\n\n"}
</>}
