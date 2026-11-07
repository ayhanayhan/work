/* Full original homepage DOM tree: React components, never runtime HTML parsing.
 * Modules may be connected to Master one by one without restructuring the page.
 */
import HeroSection from './hero';
import {moduleById,hasLocalizedContent,type HomeContent} from '@/lib/home-content';
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
export default function HomeSnapshot({home,posts=[],locale='tr'}:{home?:HomeContent|null;posts?:BlogPost[];locale?:string}){
 const show=(id:string)=>hasLocalizedContent(moduleById(home,id),locale);
 return <>
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
                      <div className={"tc-component tc-component__content tc-component--section"} id={"tc-widget-033"} hidden={!show('hero')}>
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
                      <div className={"tc-component tc-component__content tc-component--section"} id={"tc-widget-037"} hidden={!show('animated')}>
                        {"\n"}
                        <AnimatedHeadingSection home={home} locale={locale}/>
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
                      <div className={"tc-component tc-component__content tc-component--section"} id={"tc-widget-032"} hidden={!show('builder')}>
                        {"\n"}
                        <BuilderSection home={home} locale={locale}/>
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
                      <div className={"tc-component tc-component__content tc-component--section"} id={"tc-widget-035"} hidden={!show('radar')}>
                        {"\n"}
                        <RadarSection home={home} locale={locale}/>
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
                      <div className={"tc-component tc-component__content tc-component--section"} id={"tc-widget-034"} hidden={!show('channels')}>
                        {"\n"}
                        <ChannelsSection home={home} locale={locale}/>
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
                      <div className={"tc-component tc-component__content tc-component--section"} id={"tc-widget-036"} hidden={!show('showcase')}>
                        {"\n"}
                        <ShowcaseSection home={home} locale={locale}/>
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
                <div className={"tc-component tc-component__content tc-component--section"} id={"tc-widget-030"} hidden={!show('references')}>
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
                      <div className={"tc-component tc-component__content tc-component--section"} id={"tc-widget-031"} hidden={!show('bottomCta')}>
                        {"\n"}
                        <BottomCtaSection home={home} locale={locale}/>
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
  <BlogSection home={home} locale={locale} posts={posts}/>
  {"\n"}
  {"\n"}
  <FaqSection home={home} locale={locale}/>
  {"\n"}
  <FooterSnapshot />
  {"\n\n\n\n\n\n\n\n\n\n\n\n\n\n"}
</>}
