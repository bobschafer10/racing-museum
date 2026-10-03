import styles from './rooms.module.css'

export default function MuseumRoomsPage() {
  return (
    <main className={styles.roomsPage}>
      <section className={styles.roomsHero}>
        <div className={styles.roomsHeroInner}>
          <div className={styles.eyebrow}>Curated Exhibits</div>
          <h1>Museum Rooms</h1>
          <p>
            Focused exhibits that combine race results, photographs, newspapers, programs,
            yearbooks, and museum research to tell the deeper stories behind Upper Midwest racing.
          </p>
        </div>
      </section>

      <div className={styles.roomsShell}>
        <div className={styles.roomsGrid}>

          <article className={styles.roomComingSoon}>
            <span className={styles.roomNumber}>Room 002 • In Development</span>
            <h2>The Numbers of Dick Trickle</h2>
            <p>
              A visual history of the numbers, cars, owners, tracks, and victories associated
              with one of the Upper Midwest’s most recognizable racers.
            </p>
            <span className={styles.roomCta}>Coming Soon</span>
          </article>
        </div>

        <div className={styles.roomsNote}>
          Museum Rooms are curated exhibits. The detailed archive remains one level deeper whenever you want it.
        </div>
      </div>
    </main>
  )
}
