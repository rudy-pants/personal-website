// The sky, as one fragment shader. It draws, from top to bottom:
// the atmosphere above the horizon, the sun at first light, and the
// night side of Earth below. Editing this file changes how the sky looks;
// nothing in here knows about posts or page content.
//
// R   canvas size in pixels        H    horizon height (1 = top of first screen)
// T   time in seconds              K    atmosphere thickness
// C   horizon curvature            W    how far the first light has spread
// G   sun brightness               E    reading sky mix (0 = sunset, 1 = deep blue)
// A   screen width / height        VH   screen height in canvas pixels
// D1  depth where the city lights have finished fading out
// TOP distance from the horizon to the top of the page
// F   strength of the fade into night at the top of the page (matches the browser bars)
export const FRAGMENT = `precision highp float;
uniform vec2 R;
uniform float T, H, K, C, W, G, E, A, VH, D1, TOP, F;

float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) {
   vec2 i = floor(p), f = fract(p);
   f = f * f * (3. - 2. * f);
   return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
   float a = .5, s = 0.;
   for (int i = 0; i < 5; i++) { s += a * n(p); p = p * 2.03 + vec2(7.1, 3.7); a *= .5; }
   return s;
}

// Colour layers sampled from an astronaut photo of Earth's limb.
vec3 ra(float x){
   vec3 c=vec3(0.235,0.090,0.063);
   c=mix(c,vec3(0.384,0.149,0.071),smoothstep(0.000,0.008,x));
   c=mix(c,vec3(0.502,0.227,0.071),smoothstep(0.008,0.026,x));
   c=mix(c,vec3(0.545,0.282,0.071),smoothstep(0.026,0.052,x));
   c=mix(c,vec3(0.937,0.569,0.114),smoothstep(0.052,0.085,x));
   c=mix(c,vec3(0.992,0.741,0.282),smoothstep(0.085,0.125,x));
   c=mix(c,vec3(0.992,0.878,0.698),smoothstep(0.125,0.170,x));
   c=mix(c,vec3(0.984,0.949,0.922),smoothstep(0.170,0.221,x));
   c=mix(c,vec3(0.969,0.969,0.980),smoothstep(0.221,0.278,x));
   c=mix(c,vec3(0.961,0.973,0.996),smoothstep(0.278,0.339,x));
   c=mix(c,vec3(0.871,0.918,0.996),smoothstep(0.339,0.406,x));
   c=mix(c,vec3(0.624,0.729,0.984),smoothstep(0.406,0.477,x));
   c=mix(c,vec3(0.345,0.588,0.973),smoothstep(0.477,0.553,x));
   c=mix(c,vec3(0.102,0.510,0.949),smoothstep(0.553,0.634,x));
   c=mix(c,vec3(0.016,0.447,0.922),smoothstep(0.634,0.719,x));
   c=mix(c,vec3(0.012,0.404,0.863),smoothstep(0.719,0.808,x));
   c=mix(c,vec3(0.008,0.341,0.773),smoothstep(0.808,0.902,x));
   c=mix(c,vec3(0.012,0.271,0.655),smoothstep(0.902,1.000,x));
   return c;
}

void main(){
  vec2 p=vec2((gl_FragCoord.x/R.x-.5)*A,1.-(R.y-gl_FragCoord.y)/VH);
  float hz=H-C*p.x*p.x;
  float edge=hz+.007*(fbm(vec2(p.x*24.+T*.012,3.))-.5)*smoothstep(.02,.2,K);
  float s=p.y-edge,x=s/K;vec3 c=vec3(0.);
  float reveal=smoothstep(W,W*.2,abs(p.x));
  float g0=smoothstep(.02,.24,K);
  if(s>=0.){
   if(E<1.){
    float u=clamp(x,0.,1.);
    u+=.014*(fbm(vec2(p.x*1.7-T*.016,u*5.+T*.02))-.5)*smoothstep(0.,.12,u);
    c=ra(u);
    float cl=fbm(vec2(p.x*3.6+T*.014,s*210.));
    c*=1.-.58*smoothstep(.52,.7,cl)*smoothstep(.0,.05,x)*smoothstep(.16,.07,x);
    c*=reveal*mix(exp(-x*.6),1.,g0);
    c=mix(c,vec3(.004,.004,.012),F*smoothstep(TOP-.13,TOP,p.y-H));
   }
   if(E>0.){
    vec3 rs=mix(vec3(.02,.047,.141),vec3(.055,.184,.42),smoothstep(0.,1.,1.-p.y));
    float v1=fbm(vec2(p.x*.8+T*.04,p.y*1.4-T*.025)),v2=fbm(vec2(p.x*1.3-T*.03,p.y*2.1+T*.02+4.));
    rs*=1.+.34*(v1-.5);rs+=vec3(.012,.02,.07)*smoothstep(.45,.75,v2);
    rs=mix(vec3(.02,.047,.141),rs,smoothstep(.1,.3,p.y));
    c=mix(c,rs,E);
   }
  }else{
   float d=-s;
   float d2=max(hz-p.y,0.),z=.2/(d2+.05),zc=z+.5,gy=z-1.25*d2,dy=z/(d2+.05)+1.25;vec2 gw=vec2(p.x*zc,gy);
   c=ra(.012)*exp(-d*70.)*.8*reveal;
   
   c+=vec3(.005,.005,.011);
   vec2 q=(gw+vec2(0.,T*.012))*34.,id=floor(q);
   float den=smoothstep(.42,.68,fbm(id*.07+3.)),l=step(mix(.994,.9,den),h(id));
   vec2 g=(fract(q)-.5-(vec2(h(id+3.),h(id+7.))-.5)*.6)/(34.*zc);
   c+=vec3(1.,.74,.46)*l*exp(-dot(g*vec2(1.,2.),g*vec2(1.,2.))*VH*VH/3.)*.75*smoothstep(.015,.07,d)*smoothstep(D1,D1-.5,d)*(.7+.3*sin(T*1.1+h(id)*40.));
   c*=g0;
  }
  vec2 sv=(p-vec2(0.,edge))*vec2(1.,3.4);float sd=dot(sv,sv);
  c+=vec3(1.,.6,.2)*exp(-sd*1300.)*G*2.+vec3(1.,.42,.14)*exp(-sqrt(sd)*11.)*G*.42;
  c+=(h(gl_FragCoord.xy+fract(T*.7)*vec2(91.,37.))-.5)*.022*(1.-smoothstep(D1-.5,D1,H-p.y));
  gl_FragColor=vec4(c,1.);
}`;
